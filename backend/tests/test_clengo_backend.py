"""
Clengo backend integration tests.
Covers: pincodes, catalog, auth gating, orders, complaints, admin operations.
"""
import os
import io
import pytest
import requests


# ==================== Public endpoints ====================

class TestPublicEndpoints:
    def test_root(self, base_url):
        r = requests.get(f"{base_url}/api/")
        assert r.status_code == 200
        assert r.json().get("message") == "Clengo API"

    def test_list_pincodes_returns_12_seeded(self, base_url):
        r = requests.get(f"{base_url}/api/pincodes")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # Filter to seeded active list only (in case admin CRUD added others earlier)
        assert len(data) >= 12
        # All returned pincodes are active
        assert all(p.get("active") for p in data)
        # Sanity - check some seeded values exist
        pins = {p["pincode"] for p in data}
        for expected in ["110001", "110017", "201301", "122001"]:
            assert expected in pins, f"Missing expected pincode {expected}"

    def test_pincode_check_serviceable(self, base_url):
        r = requests.get(f"{base_url}/api/pincodes/check/110001")
        assert r.status_code == 200
        data = r.json()
        assert data["serviceable"] is True
        assert data["area"] is not None
        assert data["area"]["pincode"] == "110001"

    def test_pincode_check_not_serviceable(self, base_url):
        r = requests.get(f"{base_url}/api/pincodes/check/999999")
        assert r.status_code == 200
        data = r.json()
        assert data["serviceable"] is False
        assert data.get("area") in (None, {})

    def test_catalog_returns_16_items(self, base_url):
        r = requests.get(f"{base_url}/api/catalog")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 16, f"Expected 16 catalog items, got {len(data)}"
        for item in data:
            assert "item_id" in item
            assert "name" in item
            assert "category" in item
            assert "prices" in item
            for svc in ("wash", "iron", "dryclean"):
                assert svc in item["prices"], f"{item['name']} missing price for {svc}"


# ==================== Auth-gating ====================

class TestAuthGating:
    def test_me_without_auth_401(self, base_url):
        r = requests.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401

    def test_orders_me_without_auth_401(self, base_url):
        r = requests.get(f"{base_url}/api/orders/me")
        assert r.status_code == 401

    def test_admin_stats_without_auth_401(self, base_url):
        r = requests.get(f"{base_url}/api/admin/stats")
        assert r.status_code == 401

    def test_me_with_valid_token(self, base_url, user_headers, seeded_tokens):
        r = requests.get(f"{base_url}/api/auth/me", headers=user_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["user_id"] == seeded_tokens["user_id"]
        assert data["email"] == seeded_tokens["user_email"]
        assert data["role"] == "user"

    def test_me_with_invalid_token(self, base_url):
        r = requests.get(f"{base_url}/api/auth/me", headers={"Authorization": "Bearer nonexistent-token-xyz"})
        assert r.status_code == 401


# ==================== Orders ====================

@pytest.fixture(scope="class")
def created_order(base_url, seeded_tokens):
    """Create an order once and reuse."""
    headers = {"Authorization": f"Bearer {seeded_tokens['user_token']}"}
    payload = {
        "items": [
            {
                "item_id": "itm_shirt",
                "item_name": "Shirt",
                "service": "wash",
                "quantity": 3,
                "unit_price": 25,
                "subtotal": 75,
            },
            {
                "item_id": "itm_jeans",
                "item_name": "Jeans",
                "service": "iron",
                "quantity": 2,
                "unit_price": 18,
                "subtotal": 36,
            },
        ],
        "pickup_address": "123 Test St",
        "pickup_pincode": "110001",
        "pickup_date": "2026-01-20",
        "pickup_slot": "10:00 AM - 12:00 PM",
        "contact_phone": "9999999999",
        "notes": "Handle with care",
    }
    r = requests.post(f"{base_url}/api/orders", json=payload, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


class TestOrders:
    def test_create_order_success(self, created_order):
        assert created_order["order_id"].startswith("CLG-")
        # Format CLG-YYMMDD-XXXXXX
        parts = created_order["order_id"].split("-")
        assert len(parts) == 3
        assert len(parts[1]) == 6
        assert len(parts[2]) == 6
        assert created_order["total_items"] == 5
        assert created_order["total_amount"] == 111
        assert created_order["status"] == "pending"
        assert created_order["payment_method"] == "COD"

    def test_create_order_requires_auth(self, base_url):
        r = requests.post(f"{base_url}/api/orders", json={
            "items": [], "pickup_address": "x", "pickup_pincode": "110001",
            "pickup_date": "2026-01-20", "pickup_slot": "10-12", "contact_phone": "9",
        })
        assert r.status_code == 401

    def test_create_order_rejects_unserviceable_pincode(self, base_url, user_headers):
        payload = {
            "items": [{
                "item_id": "itm_shirt", "item_name": "Shirt", "service": "wash",
                "quantity": 1, "unit_price": 25, "subtotal": 25,
            }],
            "pickup_address": "somewhere",
            "pickup_pincode": "999999",
            "pickup_date": "2026-01-20",
            "pickup_slot": "10-12",
            "contact_phone": "9999999999",
        }
        r = requests.post(f"{base_url}/api/orders", json=payload, headers=user_headers)
        assert r.status_code == 400
        assert "serviceable" in r.json()["detail"].lower()

    def test_create_order_rejects_empty_items(self, base_url, user_headers):
        payload = {
            "items": [], "pickup_address": "x", "pickup_pincode": "110001",
            "pickup_date": "2026-01-20", "pickup_slot": "10-12", "contact_phone": "9",
        }
        r = requests.post(f"{base_url}/api/orders", json=payload, headers=user_headers)
        assert r.status_code == 400

    def test_orders_me_returns_only_user_orders(self, base_url, user_headers, seeded_tokens, created_order):
        r = requests.get(f"{base_url}/api/orders/me", headers=user_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        for o in data:
            assert o["user_id"] == seeded_tokens["user_id"]
        # created order should be in list
        assert any(o["order_id"] == created_order["order_id"] for o in data)

    def test_orders_me_isolates_between_users(self, base_url, user2_headers, created_order):
        r = requests.get(f"{base_url}/api/orders/me", headers=user2_headers)
        assert r.status_code == 200
        data = r.json()
        # user2 must NOT see user1's order
        assert not any(o["order_id"] == created_order["order_id"] for o in data)

    def test_get_order_by_id_owner(self, base_url, user_headers, created_order):
        r = requests.get(f"{base_url}/api/orders/{created_order['order_id']}", headers=user_headers)
        assert r.status_code == 200
        assert r.json()["order_id"] == created_order["order_id"]

    def test_get_order_by_id_other_user_forbidden(self, base_url, user2_headers, created_order):
        r = requests.get(f"{base_url}/api/orders/{created_order['order_id']}", headers=user2_headers)
        assert r.status_code == 403

    def test_get_order_by_id_admin_can_view(self, base_url, admin_headers, created_order):
        r = requests.get(f"{base_url}/api/orders/{created_order['order_id']}", headers=admin_headers)
        assert r.status_code == 200

    def test_get_order_not_found(self, base_url, user_headers):
        r = requests.get(f"{base_url}/api/orders/CLG-999999-NOTFND", headers=user_headers)
        assert r.status_code == 404


# ==================== Complaints ====================

class TestComplaints:
    def test_create_complaint_success(self, base_url, user_headers, created_order):
        payload = {
            "order_id": created_order["order_id"],
            "subject": "Late delivery",
            "message": "Order was late by 2 hours",
        }
        r = requests.post(f"{base_url}/api/complaints", json=payload, headers=user_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["complaint_id"].startswith("CMP-")
        assert data["order_id"] == created_order["order_id"]
        assert data["status"] == "open"

    def test_create_complaint_order_not_found(self, base_url, user_headers):
        payload = {"order_id": "CLG-000000-XXXXXX", "subject": "x", "message": "y"}
        r = requests.post(f"{base_url}/api/complaints", json=payload, headers=user_headers)
        assert r.status_code == 404

    def test_create_complaint_wrong_owner(self, base_url, user2_headers, created_order):
        payload = {"order_id": created_order["order_id"], "subject": "x", "message": "y"}
        r = requests.post(f"{base_url}/api/complaints", json=payload, headers=user2_headers)
        assert r.status_code == 403

    def test_complaints_me(self, base_url, user_headers):
        r = requests.get(f"{base_url}/api/complaints/me", headers=user_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1


# ==================== Admin ====================

class TestAdmin:
    def test_admin_stats_forbidden_for_user(self, base_url, user_headers):
        r = requests.get(f"{base_url}/api/admin/stats", headers=user_headers)
        assert r.status_code == 403

    def test_admin_stats_ok(self, base_url, admin_headers):
        r = requests.get(f"{base_url}/api/admin/stats", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        for k in ("total_orders", "pending", "in_process", "completed", "open_complaints", "total_users", "revenue"):
            assert k in data

    def test_admin_orders_ok(self, base_url, admin_headers, created_order):
        r = requests.get(f"{base_url}/api/admin/orders", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert any(o["order_id"] == created_order["order_id"] for o in data)

    def test_admin_orders_forbidden_for_user(self, base_url, user_headers):
        r = requests.get(f"{base_url}/api/admin/orders", headers=user_headers)
        assert r.status_code == 403

    def test_admin_orders_filter_search(self, base_url, admin_headers, created_order):
        r = requests.get(f"{base_url}/api/admin/orders", params={"search": created_order["order_id"]}, headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        assert all(created_order["order_id"] in o["order_id"] for o in data)

    def test_admin_orders_filter_status(self, base_url, admin_headers):
        r = requests.get(f"{base_url}/api/admin/orders", params={"status": "pending"}, headers=admin_headers)
        assert r.status_code == 200
        for o in r.json():
            assert o["status"] == "pending"

    def test_admin_orders_filter_pincode(self, base_url, admin_headers):
        r = requests.get(f"{base_url}/api/admin/orders", params={"pincode": "110001"}, headers=admin_headers)
        assert r.status_code == 200
        for o in r.json():
            assert o["pickup_pincode"] == "110001"

    def test_admin_orders_filter_service(self, base_url, admin_headers):
        r = requests.get(f"{base_url}/api/admin/orders", params={"service": "wash"}, headers=admin_headers)
        assert r.status_code == 200
        for o in r.json():
            assert any(i["service"] == "wash" for i in o["items"])

    def test_admin_orders_filter_date(self, base_url, admin_headers):
        r = requests.get(f"{base_url}/api/admin/orders",
                         params={"date_from": "2020-01-01", "date_to": "2099-12-31"},
                         headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_update_order_status_valid(self, base_url, admin_headers, created_order):
        r = requests.patch(
            f"{base_url}/api/admin/orders/{created_order['order_id']}/status",
            json={"status": "picked_up"}, headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "picked_up"

        # GET to confirm persistence
        r2 = requests.get(f"{base_url}/api/orders/{created_order['order_id']}", headers=admin_headers)
        assert r2.status_code == 200
        assert r2.json()["status"] == "picked_up"

    def test_admin_update_order_status_completed_sets_paid(self, base_url, admin_headers, created_order):
        r = requests.patch(
            f"{base_url}/api/admin/orders/{created_order['order_id']}/status",
            json={"status": "completed"}, headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "completed"
        assert r.json()["payment_status"] == "paid"

    def test_admin_update_order_status_invalid(self, base_url, admin_headers, created_order):
        r = requests.patch(
            f"{base_url}/api/admin/orders/{created_order['order_id']}/status",
            json={"status": "bogus"}, headers=admin_headers,
        )
        assert r.status_code == 400

    def test_admin_update_order_status_not_found(self, base_url, admin_headers):
        r = requests.patch(
            f"{base_url}/api/admin/orders/CLG-000000-NOTEXIST/status",
            json={"status": "pending"}, headers=admin_headers,
        )
        assert r.status_code == 404

    def test_admin_export_orders_xlsx(self, base_url, admin_headers):
        r = requests.get(f"{base_url}/api/admin/orders/export", headers=admin_headers)
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "spreadsheet" in ct or "openxmlformats" in ct
        # XLSX files start with PK (zip signature)
        assert r.content[:2] == b"PK"
        # Verify content-disposition
        assert ".xlsx" in r.headers.get("content-disposition", "")

    def test_admin_complaints_list(self, base_url, admin_headers):
        r = requests.get(f"{base_url}/api/admin/complaints", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_complaints_forbidden_for_user(self, base_url, user_headers):
        r = requests.get(f"{base_url}/api/admin/complaints", headers=user_headers)
        assert r.status_code == 403

    def test_admin_pincodes_forbidden_for_user(self, base_url, user_headers):
        r = requests.get(f"{base_url}/api/admin/pincodes", headers=user_headers)
        assert r.status_code == 403

    def test_admin_pincodes_crud(self, base_url, admin_headers):
        test_pin = "560001"
        # Cleanup upfront
        requests.delete(f"{base_url}/api/admin/pincodes/{test_pin}", headers=admin_headers)

        # Create
        payload = {"pincode": test_pin, "city": "Bangalore", "area": "MG Road", "active": True}
        r = requests.post(f"{base_url}/api/admin/pincodes", json=payload, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["pincode"] == test_pin

        # Verify via GET
        r2 = requests.get(f"{base_url}/api/pincodes/check/{test_pin}")
        assert r2.status_code == 200
        assert r2.json()["serviceable"] is True

        # Upsert (update city)
        payload["city"] = "Bengaluru"
        r3 = requests.post(f"{base_url}/api/admin/pincodes", json=payload, headers=admin_headers)
        assert r3.status_code == 200
        assert r3.json()["city"] == "Bengaluru"

        # Delete
        r4 = requests.delete(f"{base_url}/api/admin/pincodes/{test_pin}", headers=admin_headers)
        assert r4.status_code == 200
        assert r4.json().get("success") is True

        # Verify removed
        r5 = requests.get(f"{base_url}/api/pincodes/check/{test_pin}")
        assert r5.status_code == 200
        assert r5.json()["serviceable"] is False


# ==================== Session endpoint existence ====================

class TestSessionEndpoint:
    def test_session_endpoint_exists_and_requires_session_id(self, base_url):
        """POST /api/auth/session should exist. Without session_id -> 400."""
        r = requests.post(f"{base_url}/api/auth/session", json={})
        assert r.status_code == 400
