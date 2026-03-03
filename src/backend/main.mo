import Map "mo:core/Map";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Migration "migration";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

(with migration = Migration.run)
actor {
  type OtpEntry = {
    code : Text;
    expiresAt : Int;
  };

  var otpCounter = 0;
  let adminOtps = Map.empty<Principal, OtpEntry>();

  // New for limiting admin login attempts
  let adminLoginAttempts = Map.empty<Principal, Nat>();
  let adminLockedAccounts = Map.empty<Principal, Bool>();
  let MAX_ADMIN_LOGIN_ATTEMPTS : Nat = 5;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserProfile = {
    name : Text;
    email : Text;
    phone : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public type CustomerProfile = {
    name : Text;
    email : Text;
    mobile : Text;
    passwordHash : Text;
    memberSince : Int;
  };

  let customerProfiles = Map.empty<Principal, CustomerProfile>();
  let emailToPrincipal = Map.empty<Text, Principal>();
  let mobileToPrincipal = Map.empty<Text, Principal>();

  public shared ({ caller }) func registerCustomer(
    name : Text,
    email : Text,
    mobile : Text,
    password : Text,
  ) : async {
    #ok : Text;
    #error : Text;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can register customer profiles");
    };

    if (emailToPrincipal.containsKey(email)) {
      return #error("Email already registered");
    };

    if (mobile != "" and mobileToPrincipal.containsKey(mobile)) {
      return #error("Mobile number already registered");
    };

    let profile : CustomerProfile = {
      name;
      email;
      mobile;
      passwordHash = password;
      memberSince = 2024_01_01_0000;
    };

    customerProfiles.add(caller, profile);
    emailToPrincipal.add(email, caller);

    if (mobile != "") {
      mobileToPrincipal.add(mobile, caller);
    };

    #ok("Registration successful");
  };

  public shared ({ caller }) func loginCustomer(email : Text, password : Text) : async {
    #ok : Text;
    #error : Text;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can login");
    };

    switch (emailToPrincipal.get(email)) {
      case (null) { #error("Invalid credentials") };
      case (?principal) {
        switch (customerProfiles.get(principal)) {
          case (null) { #error("Profile not found") };
          case (?profile) {
            if (profile.passwordHash == password) {
              #ok("Login successful");
            } else {
              #error("Invalid password");
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func getMyCustomerProfile() : async ?CustomerProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can access customer profiles");
    };
    customerProfiles.get(caller);
  };

  public shared ({ caller }) func updateCustomerProfile(
    name : Text,
    email : Text,
    mobile : Text,
  ) : async {
    #ok : Text;
    #error : Text;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can update customer profiles");
    };

    switch (customerProfiles.get(caller)) {
      case (null) { #error("Profile not found") };
      case (?profile) {
        if (profile.email != email and emailToPrincipal.containsKey(email)) {
          return #error("Email already in use");
        };

        if (mobile != "" and (mobile != profile.mobile)) {
          switch (mobileToPrincipal.get(mobile)) {
            case (?existingPrincipal) {
              if (existingPrincipal != caller) {
                return #error("Mobile number already in use by another profile");
              };
            };
            case (null) {};
          };
        };

        let updated : CustomerProfile = {
          name;
          email;
          mobile;
          passwordHash = profile.passwordHash;
          memberSince = profile.memberSince;
        };
        customerProfiles.add(caller, updated);

        let currentEmail = profile.email;
        if (currentEmail != email and emailToPrincipal.get(currentEmail) == ?caller) {
          emailToPrincipal.remove(currentEmail);
        };

        emailToPrincipal.add(email, caller);

        let currentMobile = profile.mobile;
        if (mobile != currentMobile) {
          if (currentMobile != "" and mobileToPrincipal.get(currentMobile) == ?caller) {
            mobileToPrincipal.remove(currentMobile);
          };
          if (mobile != "" and (mobileToPrincipal.get(mobile) == null or mobileToPrincipal.get(mobile) == ?caller)) {
            mobileToPrincipal.add(mobile, caller);
          };
        };

        #ok("Profile updated successfully");
      };
    };
  };

  public shared ({ caller }) func changePassword(
    oldPassword : Text,
    newPassword : Text,
  ) : async {
    #ok : Text;
    #error : Text;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can change passwords");
    };

    switch (customerProfiles.get(caller)) {
      case (null) { #error("Profile not found") };
      case (?profile) {
        if (profile.passwordHash != oldPassword) {
          #error("Incorrect old password");
        } else {
          let updated : CustomerProfile = {
            name = profile.name;
            email = profile.email;
            mobile = profile.mobile;
            passwordHash = newPassword;
            memberSince = profile.memberSince;
          };
          customerProfiles.add(caller, updated);
          #ok("Password updated successfully");
        };
      };
    };
  };

  public type HotelApprovalStatus = {
    #Approved;
    #Pending;
    #Rejected;
  };

  public type Hotel = {
    id : Nat;
    name : Text;
    city : Text;
    description : Text;
    starRating : Nat;
    pricePerNight : Int;
    amenities : [Text];
    address : Text;
    imageIndex : Nat;
    approvalStatus : HotelApprovalStatus;
  };

  public type Booking = {
    id : Nat;
    hotelId : Nat;
    guestName : Text;
    guestEmail : Text;
    phone : Text;
    checkIn : Text;
    checkOut : Text;
    guestCount : Nat;
    status : Status;
    created : Int;
    owner : Principal;
  };

  public type Status = {
    #Confirmed;
    #Pending;
    #Cancelled;
  };

  module Status {
    public func compare(status1 : Status, status2 : Status) : Order.Order {
      switch (status1, status2) {
        case (#Confirmed, #Pending) { #less };
        case (#Confirmed, #Cancelled) { #less };
        case (#Pending, #Confirmed) { #greater };
        case (#Pending, #Cancelled) { #less };
        case (#Cancelled, #Confirmed) { #greater };
        case (#Cancelled, #Pending) { #greater };
        case (_) { #equal };
      };
    };
  };

  public type RoomInventory = {
    hotelId : Nat;
    roomType : Text;
    totalRooms : Nat;
    availableRooms : Nat;
  };

  public type BlockedDate = {
    id : Nat;
    hotelId : Nat;
    date : Text;
    reason : Text;
  };

  public type PropertyListing = {
    id : Nat;
    ownerName : Text;
    ownerPhone : Text;
    ownerEmail : Text;
    hotelName : Text;
    city : Text;
    address : Text;
    pricePerNight : Int;
    roomType : Text;
    amenities : [Text];
    description : Text;
    subscriptionPlan : Text;
    status : PropertyListingStatus;
    submittedAt : Int;
    submittedBy : Principal;
  };

  public type PropertyListingStatus = {
    #PendingApproval;
    #Approved;
    #Rejected;
  };

  public type HotelQueryParams = {
    city : ?Text;
    minPrice : ?Int;
    maxPrice : ?Int;
    amenities : ?[Text];
  };

  var nextHotelId = 26;
  var nextBookingId = 1;
  var nextPropertyListingId = 1;
  var nextBlockedDateId = 1;

  let hotels = Map.empty<Nat, Hotel>();
  let bookings = Map.empty<Nat, Booking>();
  let propertyListings = Map.empty<Nat, PropertyListing>();
  let hotelOwners = Map.empty<Principal, Nat>();
  let roomInventory = Map.empty<Nat, RoomInventory>();
  let blockedDates = Map.empty<Nat, BlockedDate>();

  func hasAllAmenities(hotelAmenities : [Text], required : [Text]) : Bool {
    let amenitySet = Set.fromArray(hotelAmenities);
    required.all(func(amenity) { amenitySet.contains(amenity) });
  };

  func isHotelOwner(caller : Principal) : Bool {
    switch (hotelOwners.get(caller)) {
      case (null) { false };
      case (?_) { true };
    };
  };

  func matchesQuery(hotel : Hotel, queryParams : HotelQueryParams) : Bool {
    if (hotel.approvalStatus != #Approved) { return false };

    let cityMatch = switch (queryParams.city) {
      case (null) { true };
      case (?city) {
        hotel.city.toLower().contains(#text(city.toLower()));
      };
    };

    let minPriceMatch = switch (queryParams.minPrice) {
      case (null) { true };
      case (?minPrice) { hotel.pricePerNight >= minPrice };
    };

    let maxPriceMatch = switch (queryParams.maxPrice) {
      case (null) { true };
      case (?maxPrice) { hotel.pricePerNight <= maxPrice };
    };

    let amenitiesMatch = switch (queryParams.amenities) {
      case (null) { true };
      case (?amenities) {
        hasAllAmenities(hotel.amenities, amenities);
      };
    };

    cityMatch and minPriceMatch and maxPriceMatch and amenitiesMatch;
  };

  public query func searchHotels(queryParams : HotelQueryParams) : async [Hotel] {
    hotels.values().toArray().filter(func(h) { matchesQuery(h, queryParams) });
  };

  public query func getHotel(id : Nat) : async Hotel {
    switch (hotels.get(id)) {
      case (null) { Runtime.trap("Hotel not found") };
      case (?hotel) { hotel };
    };
  };

  public query ({ caller }) func getHotelsForAdmin() : async [Hotel] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admin can view all hotels");
    };
    hotels.values().toArray();
  };

  public shared ({ caller }) func approveHotel(id : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admin can approve hotels");
    };

    switch (hotels.get(id)) {
      case (null) { Runtime.trap("Hotel not found") };
      case (?hotel) {
        let updatedHotel : Hotel = {
          id = hotel.id;
          name = hotel.name;
          city = hotel.city;
          description = hotel.description;
          starRating = hotel.starRating;
          pricePerNight = hotel.pricePerNight;
          amenities = hotel.amenities;
          address = hotel.address;
          imageIndex = hotel.imageIndex;
          approvalStatus = #Approved;
        };
        hotels.add(id, updatedHotel);
      };
    };
  };

  public shared ({ caller }) func rejectHotel(id : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admin can reject hotels");
    };

    switch (hotels.get(id)) {
      case (null) { Runtime.trap("Hotel not found") };
      case (?hotel) {
        let updatedHotel : Hotel = {
          id = hotel.id;
          name = hotel.name;
          city = hotel.city;
          description = hotel.description;
          starRating = hotel.starRating;
          pricePerNight = hotel.pricePerNight;
          amenities = hotel.amenities;
          address = hotel.address;
          imageIndex = hotel.imageIndex;
          approvalStatus = #Rejected;
        };
        hotels.add(id, updatedHotel);
      };
    };
  };

  public shared ({ caller }) func suspendHotel(id : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admin can suspend hotels");
    };

    switch (hotels.get(id)) {
      case (null) { Runtime.trap("Hotel not found") };
      case (?hotel) {
        let updatedHotel : Hotel = {
          id = hotel.id;
          name = hotel.name;
          city = hotel.city;
          description = hotel.description;
          starRating = hotel.starRating;
          pricePerNight = hotel.pricePerNight;
          amenities = hotel.amenities;
          address = hotel.address;
          imageIndex = hotel.imageIndex;
          approvalStatus = #Rejected;
        };
        hotels.add(id, updatedHotel);
      };
    };
  };

  public shared ({ caller }) func createBooking(
    hotelId : Nat,
    guestName : Text,
    guestEmail : Text,
    phone : Text,
    checkIn : Text,
    checkOut : Text,
    guestCount : Nat,
    created : Int,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create bookings");
    };

    switch (hotels.get(hotelId)) {
      case (null) { Runtime.trap("Hotel not found") };
      case (?hotel) {
        if (hotel.approvalStatus != #Approved) {
          Runtime.trap("Hotel is not approved for bookings");
        };
      };
    };

    switch (roomInventory.get(hotelId)) {
      case (null) { Runtime.trap("Room inventory not found") };
      case (?inventory) {
        if (inventory.availableRooms == 0) {
          Runtime.trap("No rooms available for selected dates");
        };
        let updatedInventory : RoomInventory = {
          hotelId = inventory.hotelId;
          roomType = inventory.roomType;
          totalRooms = inventory.totalRooms;
          availableRooms = inventory.availableRooms - 1;
        };
        roomInventory.add(hotelId, updatedInventory);
      };
    };

    let newId = nextBookingId;
    let booking : Booking = {
      id = newId;
      hotelId = hotelId;
      guestName = guestName;
      guestEmail = guestEmail;
      phone = phone;
      checkIn = checkIn;
      checkOut = checkOut;
      guestCount = guestCount;
      status = #Confirmed;
      created = created;
      owner = caller;
    };

    bookings.add(newId, booking);
    nextBookingId += 1;
    newId;
  };

  public query ({ caller }) func getBookingsByEmail(email : Text) : async [Booking] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can get bookings by email");
    };

    bookings.values().toArray().filter(func(b) { b.guestEmail == email });
  };

  public query ({ caller }) func getBooking(id : Nat) : async Booking {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view bookings");
    };

    switch (bookings.get(id)) {
      case (null) { Runtime.trap("Booking not found") };
      case (?booking) {
        if (booking.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only view your own bookings");
        };
        booking;
      };
    };
  };

  public shared ({ caller }) func cancelBooking(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can cancel bookings");
    };

    switch (bookings.get(id)) {
      case (null) { Runtime.trap("Booking not found") };
      case (?booking) {
        if (booking.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Can only cancel your own bookings");
        };

        let updatedBooking : Booking = {
          id = booking.id;
          hotelId = booking.hotelId;
          guestName = booking.guestName;
          guestEmail = booking.guestEmail;
          phone = booking.phone;
          checkIn = booking.checkIn;
          checkOut = booking.checkOut;
          guestCount = booking.guestCount;
          status = #Cancelled;
          created = booking.created;
          owner = booking.owner;
        };
        bookings.add(id, updatedBooking);

        switch (roomInventory.get(booking.hotelId)) {
          case (null) {};
          case (?inventory) {
            let restoredInventory : RoomInventory = {
              hotelId = inventory.hotelId;
              roomType = inventory.roomType;
              totalRooms = inventory.totalRooms;
              availableRooms = inventory.availableRooms + 1;
            };
            roomInventory.add(booking.hotelId, restoredInventory);
          };
        };
      };
    };
  };

  public shared ({ caller }) func submitPropertyListing(
    ownerName : Text,
    ownerPhone : Text,
    ownerEmail : Text,
    hotelName : Text,
    city : Text,
    address : Text,
    pricePerNight : Int,
    roomType : Text,
    amenities : [Text],
    description : Text,
    subscriptionPlan : Text,
    submittedAt : Int,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be logged in to submit listings");
    };

    let newId = nextPropertyListingId;
    let listing : PropertyListing = {
      id = newId;
      ownerName = ownerName;
      ownerPhone = ownerPhone;
      ownerEmail = ownerEmail;
      hotelName = hotelName;
      city = city;
      address = address;
      pricePerNight = pricePerNight;
      roomType = roomType;
      amenities = amenities;
      description = description;
      subscriptionPlan = subscriptionPlan;
      status = #PendingApproval;
      submittedAt = submittedAt;
      submittedBy = caller;
    };

    propertyListings.add(newId, listing);
    nextPropertyListingId += 1;
    newId;
  };

  public query ({ caller }) func getPropertyListings() : async [PropertyListing] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admin can see all listings");
    };
    propertyListings.values().toArray();
  };

  public query ({ caller }) func getMyPropertyListings() : async [PropertyListing] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their listings");
    };
    propertyListings.values().toArray().filter(func(l) { l.submittedBy == caller });
  };

  public shared ({ caller }) func approvePropertyListing(listingId : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admin can approve listings");
    };

    switch (propertyListings.get(listingId)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?listing) {
        if (listing.status != #PendingApproval) {
          Runtime.trap("Listing is not pending approval");
        };

        let hotelId = nextHotelId;
        let newHotel : Hotel = {
          id = hotelId;
          name = listing.hotelName;
          city = listing.city;
          description = listing.description;
          starRating = 3;
          pricePerNight = listing.pricePerNight;
          amenities = listing.amenities;
          address = listing.address;
          imageIndex = 0;
          approvalStatus = #Approved;
        };
        hotels.add(hotelId, newHotel);
        nextHotelId += 1;

        let inventory : RoomInventory = {
          hotelId = hotelId;
          roomType = listing.roomType;
          totalRooms = 10;
          availableRooms = 10;
        };
        roomInventory.add(hotelId, inventory);

        hotelOwners.add(listing.submittedBy, hotelId);

        let updatedListing : PropertyListing = {
          id = listing.id;
          ownerName = listing.ownerName;
          ownerPhone = listing.ownerPhone;
          ownerEmail = listing.ownerEmail;
          hotelName = listing.hotelName;
          city = listing.city;
          address = listing.address;
          pricePerNight = listing.pricePerNight;
          roomType = listing.roomType;
          amenities = listing.amenities;
          description = listing.description;
          subscriptionPlan = listing.subscriptionPlan;
          status = #Approved;
          submittedAt = listing.submittedAt;
          submittedBy = listing.submittedBy;
        };
        propertyListings.add(listingId, updatedListing);
      };
    };
  };

  public shared ({ caller }) func rejectPropertyListing(id : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admin can reject listings");
    };

    switch (propertyListings.get(id)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?listing) {
        let updated : PropertyListing = {
          id = listing.id;
          ownerName = listing.ownerName;
          ownerPhone = listing.ownerPhone;
          ownerEmail = listing.ownerEmail;
          hotelName = listing.hotelName;
          city = listing.city;
          address = listing.address;
          pricePerNight = listing.pricePerNight;
          roomType = listing.roomType;
          amenities = listing.amenities;
          description = listing.description;
          subscriptionPlan = listing.subscriptionPlan;
          status = #Rejected;
          submittedAt = listing.submittedAt;
          submittedBy = listing.submittedBy;
        };
        propertyListings.add(id, updated);
      };
    };
  };

  public query ({ caller }) func getAllBookings() : async [Booking] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can access all bookings");
    };
    bookings.values().toArray();
  };

  public query ({ caller }) func getMyBookings() : async [Booking] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view bookings.");
    };

    bookings.values().toArray().filter(func(booking) { booking.owner == caller }).sort(
      func(a, b) = Int.compare(b.created, a.created)
    );
  };

  public shared ({ caller }) func assignHotelOwner(
    hotelId : Nat,
    ownerPrincipal : Principal,
  ) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admin can assign hotel owners");
    };
    switch (hotels.get(hotelId)) {
      case (null) { Runtime.trap("Hotel not found") };
      case (?_) {
        hotelOwners.add(ownerPrincipal, hotelId);
      };
    };
  };

  public shared ({ caller }) func revokeHotelOwner(hotelId : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admin can revoke hotel owners");
    };

    let ownerToRevoke = hotelOwners.filter(func(_k, v) { v == hotelId }).keys().next();
    switch (ownerToRevoke) {
      case (null) { Runtime.trap("No owner found for this hotel") };
      case (?owner) {
        hotelOwners.remove(owner);
      };
    };
  };

  public query ({ caller }) func getOwnerHotel() : async Hotel {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access this");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can access this");
    };

    switch (hotelOwners.get(caller)) {
      case (null) { Runtime.trap("No hotel associated with caller") };
      case (?hotelId) {
        switch (hotels.get(hotelId)) {
          case (null) { Runtime.trap("Hotel not found") };
          case (?hotel) { hotel };
        };
      };
    };
  };

  public query ({ caller }) func getOwnerBookings() : async [Booking] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access this");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can access this");
    };

    switch (hotelOwners.get(caller)) {
      case (null) { Runtime.trap("No hotel associated with caller") };
      case (?hotelId) {
        bookings.values().toArray().filter(func(b) { b.hotelId == hotelId }).sort(
          func(a, b) = Int.compare(b.created, a.created)
        );
      };
    };
  };

  public shared ({ caller }) func updateBookingStatus(
    bookingId : Nat,
    newStatus : Status,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access this");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can access this");
    };

    switch (bookings.get(bookingId)) {
      case (null) { Runtime.trap("Booking not found") };
      case (?booking) {
        switch (hotelOwners.get(caller)) {
          case (null) { Runtime.trap("No hotel associated with caller") };
          case (?hotelId) {
            if (booking.hotelId != hotelId) {
              Runtime.trap("Booking does not belong to your hotel");
            };

            let oldStatus = booking.status;

            let updatedBooking : Booking = {
              id = booking.id;
              hotelId = booking.hotelId;
              guestName = booking.guestName;
              guestEmail = booking.guestEmail;
              phone = booking.phone;
              checkIn = booking.checkIn;
              checkOut = booking.checkOut;
              guestCount = booking.guestCount;
              status = newStatus;
              created = booking.created;
              owner = booking.owner;
            };
            bookings.add(bookingId, updatedBooking);

            switch (roomInventory.get(hotelId)) {
              case (null) {};
              case (?inventory) {
                var newAvailable = inventory.availableRooms;

                switch (oldStatus, newStatus) {
                  case (#Pending, #Confirmed) {
                    if (newAvailable > 0) {
                      newAvailable -= 1;
                    };
                  };
                  case (#Confirmed, #Cancelled) {
                    newAvailable += 1;
                  };
                  case (#Pending, #Cancelled) {};
                  case (#Confirmed, #Confirmed) {};
                  case (#Cancelled, #Cancelled) {};
                  case (#Pending, #Pending) {};
                  case (#Cancelled, #Confirmed) {
                    if (newAvailable > 0) {
                      newAvailable -= 1;
                    };
                  };
                  case (#Confirmed, #Pending) {
                    newAvailable += 1;
                  };
                  case (#Cancelled, #Pending) {};
                };

                let updatedInventory : RoomInventory = {
                  hotelId = inventory.hotelId;
                  roomType = inventory.roomType;
                  totalRooms = inventory.totalRooms;
                  availableRooms = newAvailable;
                };
                roomInventory.add(hotelId, updatedInventory);
              };
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func getOwnerRoomInventory() : async RoomInventory {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access this");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can access this");
    };

    switch (hotelOwners.get(caller)) {
      case (null) { Runtime.trap("No hotel associated with caller") };
      case (?hotelId) {
        switch (roomInventory.get(hotelId)) {
          case (null) { Runtime.trap("Room inventory not found") };
          case (?inventory) { inventory };
        };
      };
    };
  };

  public shared ({ caller }) func updateRoomInventory(
    roomType : Text,
    totalRooms : Nat,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access this");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can access this");
    };

    switch (hotelOwners.get(caller)) {
      case (null) { Runtime.trap("No hotel associated with caller") };
      case (?hotelId) {
        let availableRooms = switch (roomInventory.get(hotelId)) {
          case (null) { totalRooms };
          case (?inv) { Int.min(inv.availableRooms, totalRooms).toNat() };
        };
        let inventory : RoomInventory = {
          hotelId;
          roomType;
          totalRooms;
          availableRooms;
        };
        roomInventory.add(hotelId, inventory);
      };
    };
  };

  public query ({ caller }) func getBlockedDates() : async [BlockedDate] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access this");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can access this");
    };

    switch (hotelOwners.get(caller)) {
      case (null) { Runtime.trap("No hotel associated with caller") };
      case (?hotelId) {
        let blocked = blockedDates.filter(
          func(_k, v) { v.hotelId == hotelId }
        ).values().toArray();
        blocked;
      };
    };
  };

  public shared ({ caller }) func blockDate(
    date : Text,
    reason : Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access this");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can access this");
    };

    switch (hotelOwners.get(caller)) {
      case (null) { Runtime.trap("No hotel associated with caller") };
      case (?hotelId) {
        let blockedDate : BlockedDate = {
          id = nextBlockedDateId;
          hotelId;
          date;
          reason;
        };
        blockedDates.add(nextBlockedDateId, blockedDate);
        nextBlockedDateId += 1;
      };
    };
  };

  public shared ({ caller }) func unblockDate(blockedDateId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access this");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can access this");
    };

    switch (blockedDates.get(blockedDateId)) {
      case (null) { Runtime.trap("Blocked date not found") };
      case (?blocked) {
        switch (hotelOwners.get(caller)) {
          case (null) { Runtime.trap("No hotel associated with caller") };
          case (?hotelId) {
            if (blocked.hotelId != hotelId) {
              Runtime.trap("Blocked date does not belong to your hotel");
            };
            blockedDates.remove(blockedDateId);
          };
        };
      };
    };
  };

  public query ({ caller }) func isCallerHotelOwner() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return false;
    };
    hotelOwners.containsKey(caller);
  };

  public shared ({ caller }) func generateAdminOtp() : async Text {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can generate OTP");
    };

    otpCounter += 1;
    let value = ((otpCounter * 1_000_003) + Time.now()) % 1_000_000;
    let code = padToSixDigits(value.toText());
    let expiresAt = Time.now() + (10 * 60 * 1_000_000_000);

    let otpEntry : OtpEntry = {
      code;
      expiresAt;
    };

    adminOtps.add(caller, otpEntry);
    code;
  };

  public shared ({ caller }) func verifyAdminOtp(code : Text) : async {
    #ok : Text;
    #error : Text;
  } {
    // Note: This function should NOT require admin permission check
    // because it's part of the authentication flow itself.
    // The OTP verification is the authentication mechanism.
    // However, we need to verify that an OTP was generated for this principal.

    switch (adminLockedAccounts.get(caller)) {
      case (?true) {
        return #error("Account locked. Too many failed attempts. Contact another super admin to unlock.");
      };
      case (_) {};
    };

    switch (adminOtps.get(caller)) {
      case (null) {
        // No OTP exists for this caller - they may not be an admin or haven't generated OTP
        adminLoginAttempts.add(caller, 1);
        #error("Invalid OTP. 4 attempts remaining.");
      };
      case (?entry) {
        let now = Time.now();
        if (now > entry.expiresAt) {
          adminOtps.remove(caller);
          #error("OTP expired");
        } else if (code == entry.code) {
          adminLoginAttempts.remove(caller);
          adminOtps.remove(caller);
          #ok("Verified");
        } else {
          let currentCount = switch (adminLoginAttempts.get(caller)) {
            case (null) { 0 };
            case (?count) { count };
          };
          let newCount = currentCount + 1;
          adminLoginAttempts.add(caller, newCount);

          if (newCount >= MAX_ADMIN_LOGIN_ATTEMPTS) {
            adminLockedAccounts.add(caller, true);
            adminLoginAttempts.remove(caller);
            return #error("Account locked after 5 failed attempts. Contact another super admin to unlock.");
          } else {
            let remainingAttempts = MAX_ADMIN_LOGIN_ATTEMPTS - newCount;
            return #error("Invalid OTP. " # remainingAttempts.toText() # " attempts remaining.");
          };
        };
      };
    };
  };

  public query ({ caller }) func getAdminLockStatus() : async { locked : Bool; failedAttempts : Nat } {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can access lock status");
    };

    let locked = switch (adminLockedAccounts.get(caller)) {
      case (?true) { true };
      case (_) { false };
    };

    let failedAttempts = switch (adminLoginAttempts.get(caller)) {
      case (null) { 0 };
      case (?count) { count };
    };

    { locked; failedAttempts };
  };

  public shared ({ caller }) func unlockAdminAccount(target : Principal) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can unlock accounts");
    };

    if (caller == target) {
      Runtime.trap("Cannot unlock your own account");
    };

    adminLockedAccounts.remove(target);
    adminLoginAttempts.remove(target);
  };

  func padToSixDigits(s : Text) : Text {
    let len = s.size();
    if (len >= 6) { return s };

    let needed = 6 - len;
    let zeros = Array.repeat("0", needed);
    zeros.concat([s]).toText();
  };
};
