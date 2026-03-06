import requests
import sys
import json
import base64
from datetime import datetime

class FoodBridgeAPITester:
    def __init__(self, base_url="https://hunger-zero-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_data = {}
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            default_headers['Authorization'] = f'Bearer {self.token}'
            
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text[:200]}...")
                    
            return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "/api/", 200)

    def test_register_donor(self):
        """Test donor registration"""
        donor_data = {
            "email": f"donor_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test Donor Restaurant",
            "role": "donor",
            "organisation_name": "Test Restaurant",
            "organisation_type": "restaurant",
            "phone": "+91-9876543210",
            "address": "123 Restaurant Street, Delhi",
            "latitude": 28.6139,
            "longitude": 77.2090
        }
        
        success, response = self.run_test("Register Donor", "POST", "/api/auth/register", 200, donor_data)
        if success and 'token' in response:
            self.token = response['token']
            self.user_data['donor'] = response['user']
            print(f"   Donor registered with ID: {response['user']['id']}")
            return True
        return False

    def test_register_receiver(self):
        """Test receiver registration"""
        receiver_data = {
            "email": f"receiver_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test Shelter",
            "role": "receiver",
            "organisation_name": "Test NGO Shelter",
            "organisation_type": "ngo",
            "phone": "+91-9876543211",
            "address": "456 Shelter Street, Delhi",
            "latitude": 28.6239,
            "longitude": 77.2190
        }
        
        success, response = self.run_test("Register Receiver", "POST", "/api/auth/register", 200, receiver_data)
        if success and 'token' in response:
            self.user_data['receiver'] = response['user']
            self.user_data['receiver']['token'] = response['token']
            print(f"   Receiver registered with ID: {response['user']['id']}")
            return True
        return False

    def test_register_volunteer(self):
        """Test volunteer registration"""
        volunteer_data = {
            "email": f"volunteer_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test Volunteer",
            "role": "volunteer",
            "phone": "+91-9876543212",
            "address": "789 Volunteer Street, Delhi",
            "latitude": 28.6339,
            "longitude": 77.2290,
            "transport_mode": "bike"
        }
        
        success, response = self.run_test("Register Volunteer", "POST", "/api/auth/register", 200, volunteer_data)
        if success and 'token' in response:
            self.user_data['volunteer'] = response['user']
            self.user_data['volunteer']['token'] = response['token']
            print(f"   Volunteer registered with ID: {response['user']['id']}")
            return True
        return False

    def test_login(self):
        """Test login with donor credentials"""
        if 'donor' not in self.user_data:
            return False
            
        # Extract email from donor data  
        donor_email = None
        for key, value in self.user_data.items():
            if key == 'donor':
                donor_email = value.get('email')
                break
                
        if not donor_email:
            return False
            
        login_data = {
            "email": donor_email,
            "password": "TestPass123!"
        }
        
        success, response = self.run_test("Login", "POST", "/api/auth/login", 200, login_data)
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user profile"""
        success, response = self.run_test("Get Current User", "GET", "/api/auth/me", 200)
        return success and 'id' in response

    def test_create_donation(self):
        """Test creating a donation with AI analysis"""
        # Create a simple test image (1x1 pixel PNG in base64)
        test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8EbgAAAABJRU5ErkJggg=="
        
        donation_data = {
            "food_name": "Test Vegetable Biryani",
            "ingredients": "Rice, vegetables, spices",
            "servings_estimate": 50,
            "preparation_time": 2,
            "image_base64": test_image_base64
        }
        
        success, response = self.run_test("Create Donation", "POST", "/api/donations", 200, donation_data)
        if success and 'id' in response:
            self.user_data['donation_id'] = response['id']
            print(f"   Donation created with ID: {response['id']}")
            print(f"   Freshness score: {response.get('freshness_score')}")
            print(f"   Urgency score: {response.get('urgency_score')}")
            return True
        return False

    def test_get_donations(self):
        """Test getting donations list"""
        success, response = self.run_test("Get Donations", "GET", "/api/donations", 200)
        return success and isinstance(response, list)

    def test_accept_donation_as_receiver(self):
        """Test accepting donation as receiver"""
        if 'donation_id' not in self.user_data or 'receiver' not in self.user_data:
            print("   Skipping - no donation or receiver available")
            return True
            
        # Switch to receiver token
        old_token = self.token
        self.token = self.user_data['receiver']['token']
        
        success, response = self.run_test(
            "Accept Donation (Receiver)", 
            "POST", 
            f"/api/donations/{self.user_data['donation_id']}/accept", 
            200
        )
        
        # Switch back to donor token
        self.token = old_token
        
        if success and 'message' in response:
            print(f"   Response: {response['message']}")
            return True
        return False

    def test_get_assignments(self):
        """Test getting volunteer assignments"""
        if 'volunteer' not in self.user_data:
            print("   Skipping - no volunteer available")
            return True
            
        # Switch to volunteer token
        old_token = self.token
        self.token = self.user_data['volunteer']['token']
        
        success, response = self.run_test("Get Assignments", "GET", "/api/assignments", 200)
        
        # Switch back
        self.token = old_token
        
        return success and isinstance(response, list)

    def test_get_metrics(self):
        """Test getting impact metrics"""
        success, response = self.run_test("Get Metrics", "GET", "/api/metrics", 200)
        return success and 'global' in response and 'user' in response

    def test_get_chart_data(self):
        """Test getting chart data for analytics"""
        success, response = self.run_test("Get Chart Data", "GET", "/api/metrics/chart-data", 200)
        return success and 'daily' in response

    def test_update_location(self):
        """Test updating user location"""
        location_data = {
            "latitude": 28.6139,
            "longitude": 77.2090
        }
        success, response = self.run_test("Update Location", "PUT", "/api/auth/location", 200, location_data)
        return success

def main():
    print("🚀 Starting FoodBridge API Testing...")
    print("=" * 50)
    
    tester = FoodBridgeAPITester()
    
    # Test sequence
    tests = [
        ("Root API", tester.test_root_endpoint),
        ("Register Donor", tester.test_register_donor),
        ("Register Receiver", tester.test_register_receiver),
        ("Register Volunteer", tester.test_register_volunteer),
        ("Login", tester.test_login),
        ("Get Current User", tester.test_get_current_user),
        ("Update Location", tester.test_update_location),
        ("Create Donation", tester.test_create_donation),
        ("Get Donations", tester.test_get_donations),
        ("Accept Donation", tester.test_accept_donation_as_receiver),
        ("Get Assignments", tester.test_get_assignments),
        ("Get Metrics", tester.test_get_metrics),
        ("Get Chart Data", tester.test_get_chart_data),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests: {', '.join(failed_tests)}")
    else:
        print("\n🎉 All tests passed!")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())