import Map "mo:core/Map";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
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

  func initializeHotels() {
    let initialHotels : [Hotel] = [
      {
        id = 1;
        name = "Ganga View Inn";
        city = "Haridwar";
        description = "Standard | Budget stay near Har Ki Pauri ghat";
        starRating = 3;
        pricePerNight = 899;
        amenities = ["WiFi", "AC"];
        address = "Har Ki Pauri Road, Haridwar";
        imageIndex = 1;
        approvalStatus = #Approved;
      },
      {
        id = 2;
        name = "Haridwar Budget Lodge";
        city = "Haridwar";
        description = "Standard | Clean rooms near main market";
        starRating = 2;
        pricePerNight = 599;
        amenities = ["WiFi"];
        address = "Main Bazar, Haridwar";
        imageIndex = 2;
        approvalStatus = #Approved;
      },
      {
        id = 3;
        name = "Shivalik Residency";
        city = "Haridwar";
        description = "Deluxe | Comfortable stay with mountain views";
        starRating = 4;
        pricePerNight = 1799;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Railway Road, Haridwar";
        imageIndex = 3;
        approvalStatus = #Approved;
      },
      {
        id = 4;
        name = "Pilgrims Nest Haridwar";
        city = "Haridwar";
        description = "Standard | Walking distance to ghats";
        starRating = 3;
        pricePerNight = 799;
        amenities = ["WiFi", "AC"];
        address = "Ghat Area, Haridwar";
        imageIndex = 4;
        approvalStatus = #Approved;
      },
      {
        id = 5;
        name = "Devbhoomi Grand";
        city = "Haridwar";
        description = "Suite | Luxury suites near Chandi Devi";
        starRating = 5;
        pricePerNight = 3499;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Chandi Devi Road, Haridwar";
        imageIndex = 5;
        approvalStatus = #Approved;
      },
      {
        id = 6;
        name = "Riverside Budget Inn";
        city = "Rishikesh";
        description = "Standard | Steps from Laxman Jhula";
        starRating = 3;
        pricePerNight = 999;
        amenities = ["WiFi", "AC"];
        address = "Laxman Jhula, Rishikesh";
        imageIndex = 6;
        approvalStatus = #Approved;
      },
      {
        id = 7;
        name = "Yoga Retreat Lodge";
        city = "Rishikesh";
        description = "Standard | Peaceful stay near ashrams";
        starRating = 3;
        pricePerNight = 849;
        amenities = ["WiFi"];
        address = "Tapovan, Rishikesh";
        imageIndex = 7;
        approvalStatus = #Approved;
      },
      {
        id = 8;
        name = "Ganga Breeze Hotel";
        city = "Rishikesh";
        description = "Deluxe | Riverside rooms with Ganga view";
        starRating = 4;
        pricePerNight = 2199;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Ram Jhula Road, Rishikesh";
        imageIndex = 8;
        approvalStatus = #Approved;
      },
      {
        id = 9;
        name = "Adventure Camp Rishikesh";
        city = "Rishikesh";
        description = "Standard | Near rafting and trekking zones";
        starRating = 3;
        pricePerNight = 1199;
        amenities = ["WiFi", "Parking"];
        address = "Shivpuri, Rishikesh";
        imageIndex = 9;
        approvalStatus = #Approved;
      },
      {
        id = 10;
        name = "The Himalayan Retreat";
        city = "Rishikesh";
        description = "Suite | Premium suites with valley views";
        starRating = 5;
        pricePerNight = 4299;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Neelkanth Road, Rishikesh";
        imageIndex = 10;
        approvalStatus = #Approved;
      },
      {
        id = 11;
        name = "Valley View Budget Hotel";
        city = "Mussoorie";
        description = "Standard | Affordable stay with doon valley view";
        starRating = 3;
        pricePerNight = 1099;
        amenities = ["WiFi", "AC"];
        address = "Mall Road, Mussoorie";
        imageIndex = 11;
        approvalStatus = #Approved;
      },
      {
        id = 12;
        name = "Mussoorie Hillside Inn";
        city = "Mussoorie";
        description = "Standard | Cozy rooms near Kempty Falls";
        starRating = 2;
        pricePerNight = 849;
        amenities = ["WiFi"];
        address = "Kempty Fall Road, Mussoorie";
        imageIndex = 12;
        approvalStatus = #Approved;
      },
      {
        id = 13;
        name = "Cloud End Resort";
        city = "Mussoorie";
        description = "Deluxe | Stunning cloud-level mountain views";
        starRating = 4;
        pricePerNight = 2799;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Landour, Mussoorie";
        imageIndex = 13;
        approvalStatus = #Approved;
      },
      {
        id = 14;
        name = "Landour Heritage Hotel";
        city = "Mussoorie";
        description = "Deluxe | Colonial-era building with period charm";
        starRating = 4;
        pricePerNight = 2299;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Landour Cantonment, Mussoorie";
        imageIndex = 14;
        approvalStatus = #Approved;
      },
      {
        id = 15;
        name = "The Grand Mussoorie";
        city = "Mussoorie";
        description = "Suite | Five-star luxury on the ridge";
        starRating = 5;
        pricePerNight = 5499;
        amenities = ["WiFi", "AC", "Parking"];
        address = "The Mall, Mussoorie";
        imageIndex = 15;
        approvalStatus = #Approved;
      },
      {
        id = 16;
        name = "Dhanaulti Eco Camp";
        city = "Dhanaulti";
        description = "Standard | Forest eco stay surrounded by deodar trees";
        starRating = 3;
        pricePerNight = 1299;
        amenities = ["WiFi", "Parking"];
        address = "Eco Park Road, Dhanaulti";
        imageIndex = 1;
        approvalStatus = #Approved;
      },
      {
        id = 17;
        name = "Pine Grove Cottage";
        city = "Dhanaulti";
        description = "Standard | Rustic cottages in pine forest";
        starRating = 3;
        pricePerNight = 1099;
        amenities = ["WiFi"];
        address = "Forest Area, Dhanaulti";
        imageIndex = 2;
        approvalStatus = #Approved;
      },
      {
        id = 18;
        name = "Snow View Resort";
        city = "Dhanaulti";
        description = "Deluxe | Panoramic Himalayan snow views";
        starRating = 4;
        pricePerNight = 2499;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Snow View Point, Dhanaulti";
        imageIndex = 3;
        approvalStatus = #Approved;
      },
      {
        id = 19;
        name = "Himalayan Woods Stay";
        city = "Dhanaulti";
        description = "Standard | Budget stay in quiet forest zone";
        starRating = 2;
        pricePerNight = 799;
        amenities = ["WiFi"];
        address = "Village Road, Dhanaulti";
        imageIndex = 4;
        approvalStatus = #Approved;
      },
      {
        id = 20;
        name = "Cedar Heights Dhanaulti";
        city = "Dhanaulti";
        description = "Suite | Premium cedar-clad suites, mountain air";
        starRating = 5;
        pricePerNight = 4999;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Ridge Top, Dhanaulti";
        imageIndex = 5;
        approvalStatus = #Approved;
      },
      {
        id = 21;
        name = "Doon Budget Inn";
        city = "Dehradun";
        description = "Standard | Affordable city stay near railway station";
        starRating = 2;
        pricePerNight = 699;
        amenities = ["WiFi"];
        address = "Railway Station Road, Dehradun";
        imageIndex = 6;
        approvalStatus = #Approved;
      },
      {
        id = 22;
        name = "Rajpur Road Residency";
        city = "Dehradun";
        description = "Standard | Central location near markets";
        starRating = 3;
        pricePerNight = 1199;
        amenities = ["WiFi", "AC"];
        address = "Rajpur Road, Dehradun";
        imageIndex = 7;
        approvalStatus = #Approved;
      },
      {
        id = 23;
        name = "Forest Research Inn";
        city = "Dehradun";
        description = "Deluxe | Green campus, near FRI and clock tower";
        starRating = 4;
        pricePerNight = 2099;
        amenities = ["WiFi", "AC", "Parking"];
        address = "FRI Campus Area, Dehradun";
        imageIndex = 8;
        approvalStatus = #Approved;
      },
      {
        id = 24;
        name = "Mussoorie Road Hotel";
        city = "Dehradun";
        description = "Deluxe | Gateway to the hills, valley views";
        starRating = 4;
        pricePerNight = 1799;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Mussoorie Road, Dehradun";
        imageIndex = 9;
        approvalStatus = #Approved;
      },
      {
        id = 25;
        name = "Doon Valley Grand";
        city = "Dehradun";
        description = "Suite | Luxury suites with Doon Valley panorama";
        starRating = 5;
        pricePerNight = 3999;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Chakrata Road, Dehradun";
        imageIndex = 10;
        approvalStatus = #Approved;
      },
    ];

    for (hotel in initialHotels.values()) {
      hotels.add(hotel.id, hotel);
      roomInventory.add(
        hotel.id,
        { hotelId = hotel.id; roomType = "Standard"; totalRooms = 10; availableRooms = 10 },
      );
    };

    nextHotelId := 26;
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
      case (?minPrice) {
        hotel.pricePerNight >= minPrice;
      };
    };

    let maxPriceMatch = switch (queryParams.maxPrice) {
      case (null) { true };
      case (?maxPrice) {
        hotel.pricePerNight <= maxPrice;
      };
    };

    let amenitiesMatch = switch (queryParams.amenities) {
      case (null) { true };
      case (?amenities) {
        hasAllAmenities(hotel.amenities, amenities);
      };
    };

    cityMatch and minPriceMatch and maxPriceMatch and amenitiesMatch;
  };

  // Public query - no authentication required
  public query func searchHotels(queryParams : HotelQueryParams) : async [Hotel] {
    hotels.values().toArray().filter(func(h) { matchesQuery(h, queryParams) });
  };

  // Public query - no authentication required
  public query func getHotel(id : Nat) : async Hotel {
    switch (hotels.get(id)) {
      case (null) { Runtime.trap("Hotel not found") };
      case (?hotel) { hotel };
    };
  };

  // Admin only
  public query ({ caller }) func getHotelsForAdmin() : async [Hotel] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admin can view all hotels");
    };
    hotels.values().toArray();
  };

  // Admin only
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

  // Admin only
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

  // Admin only - suspends hotel by setting status to Rejected
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

  // User only
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

  // Admin only
  public query ({ caller }) func getBookingsByEmail(email : Text) : async [Booking] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can get bookings by email");
    };

    bookings.values().toArray().filter(func(b) { b.guestEmail == email });
  };

  // User only (own bookings or admin)
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

  // User only (own bookings or admin)
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

  // User only
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

  // Admin only
  public query ({ caller }) func getPropertyListings() : async [PropertyListing] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admin can see all listings");
    };
    propertyListings.values().toArray();
  };

  // User only (own listings)
  public query ({ caller }) func getMyPropertyListings() : async [PropertyListing] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their listings");
    };
    propertyListings.values().toArray().filter(func(l) { l.submittedBy == caller });
  };

  // Admin only
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

  // Admin only
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

  // Admin only
  public query ({ caller }) func getAllBookings() : async [Booking] {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can access all bookings");
    };
    bookings.values().toArray();
  };

  // User only (own bookings)
  public query ({ caller }) func getMyBookings() : async [Booking] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view bookings.");
    };

    bookings.values().toArray().filter(func(booking) { booking.owner == caller }).sort(
      func(a, b) = Int.compare(b.created, a.created)
    );
  };

  // Admin only
  public shared ({ caller }) func assignHotelOwner(hotelId : Nat, ownerPrincipal : Principal) : async () {
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

  // Admin only
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

  // Hotel owner only
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

  // Hotel owner only
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

  // Hotel owner only (for their hotel's bookings)
  public shared ({ caller }) func updateBookingStatus(bookingId : Nat, newStatus : Status) : async () {
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

  // Hotel owner only
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

  // Hotel owner only
  public shared ({ caller }) func updateRoomInventory(roomType : Text, totalRooms : Nat) : async () {
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

  // Hotel owner only
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

  // Hotel owner only
  public shared ({ caller }) func blockDate(date : Text, reason : Text) : async () {
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

  // Hotel owner only
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

  initializeHotels();
};
