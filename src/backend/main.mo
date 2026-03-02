import Map "mo:core/Map";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Migration "migration";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

(with migration = Migration.run)
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

  type Hotel = {
    id : Nat;
    name : Text;
    city : Text;
    description : Text;
    starRating : Nat;
    pricePerNight : Int;
    amenities : [Text];
    address : Text;
    imageIndex : Nat;
  };

  type Booking = {
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

  type Status = {
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

  type HotelQueryParams = {
    city : ?Text;
    minPrice : ?Int;
    maxPrice : ?Int;
    amenities : ?[Text];
  };

  var nextHotelId = 1;
  var nextBookingId = 1;
  var nextPropertyListingId = 1;

  let hotels = Map.empty<Nat, Hotel>();
  let bookings = Map.empty<Nat, Booking>();
  let propertyListings = Map.empty<Nat, PropertyListing>();

  func hasAllAmenities(hotelAmenities : [Text], required : [Text]) : Bool {
    let amenitySet = Set.fromArray(hotelAmenities);
    required.all(func(amenity) { amenitySet.contains(amenity) });
  };

  func initializeHotels() {
    let initialHotels : [Hotel] = [
      {
        id = 1;
        name = "Taj Palace";
        city = "Mumbai";
        description = "Luxury 5-star hotel with sea views";
        starRating = 5;
        pricePerNight = 7500;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Marine Drive, Mumbai";
        imageIndex = 1;
      },
      {
        id = 2;
        name = "Budget Inn";
        city = "Delhi";
        description = "Affordable rooms in city center";
        starRating = 3;
        pricePerNight = 1200;
        amenities = ["WiFi", "Parking"];
        address = "Connaught Place, Delhi";
        imageIndex = 2;
      },
      {
        id = 3;
        name = "Goa Beach Resort";
        city = "Goa";
        description = "Beachfront resort with pool";
        starRating = 4;
        pricePerNight = 4200;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Calangute Beach, Goa";
        imageIndex = 3;
      },
      {
        id = 4;
        name = "Hyderabad Suites";
        city = "Hyderabad";
        description = "Modern hotel in business district";
        starRating = 4;
        pricePerNight = 3500;
        amenities = ["WiFi", "AC"];
        address = "Banjara Hills, Hyderabad";
        imageIndex = 4;
      },
      {
        id = 5;
        name = "Royal Heritage";
        city = "Jaipur";
        description = "Traditional Rajasthani decor";
        starRating = 5;
        pricePerNight = 6500;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Amer Road, Jaipur";
        imageIndex = 5;
      },
      {
        id = 6;
        name = "Chennai Comforts";
        city = "Chennai";
        description = "Business-friendly hotel";
        starRating = 3;
        pricePerNight = 1800;
        amenities = ["WiFi", "AC"];
        address = "T Nagar, Chennai";
        imageIndex = 6;
      },
      {
        id = 7;
        name = "Bangalore Boutique";
        city = "Bangalore";
        description = "Stylish boutique hotel";
        starRating = 4;
        pricePerNight = 3800;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Indiranagar, Bangalore";
        imageIndex = 7;
      },
      {
        id = 8;
        name = "Mumbai Express Lodge";
        city = "Mumbai";
        description = "Convenient location near airport";
        starRating = 2;
        pricePerNight = 900;
        amenities = ["WiFi"];
        address = "Andheri East, Mumbai";
        imageIndex = 8;
      },
      {
        id = 9;
        name = "Delhi Palace";
        city = "Delhi";
        description = "Historic luxury hotel";
        starRating = 5;
        pricePerNight = 8000;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Janpath, Delhi";
        imageIndex = 9;
      },
      {
        id = 10;
        name = "Goa Budget Stay";
        city = "Goa";
        description = "Affordable rooms near beach";
        starRating = 3;
        pricePerNight = 1500;
        amenities = ["WiFi", "Parking"];
        address = "Candolim, Goa";
        imageIndex = 10;
      },
      {
        id = 11;
        name = "Jaipur Oasis";
        city = "Jaipur";
        description = "Peaceful garden setting";
        starRating = 4;
        pricePerNight = 4000;
        amenities = ["WiFi", "AC"];
        address = "C-Scheme, Jaipur";
        imageIndex = 1;
      },
      {
        id = 12;
        name = "Hyderabad Heritage";
        city = "Hyderabad";
        description = "Traditional architecture";
        starRating = 3;
        pricePerNight = 2200;
        amenities = ["WiFi", "Parking"];
        address = "Charminar, Hyderabad";
        imageIndex = 2;
      },
      {
        id = 13;
        name = "Chennai Seaview";
        city = "Chennai";
        description = "Ocean-facing rooms";
        starRating = 5;
        pricePerNight = 6800;
        amenities = ["WiFi", "AC", "Parking"];
        address = "ECR Road, Chennai";
        imageIndex = 3;
      },
      {
        id = 14;
        name = "Bangalore Budget Inn";
        city = "Bangalore";
        description = "Affordable city stay";
        starRating = 2;
        pricePerNight = 700;
        amenities = ["WiFi"];
        address = "MG Road, Bangalore";
        imageIndex = 4;
      },
      {
        id = 15;
        name = "Goa Beachfront Villas";
        city = "Goa";
        description = "Private villas on beach";
        starRating = 5;
        pricePerNight = 7500;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Baga Beach, Goa";
        imageIndex = 5;
      },
      // Bihar-focused hotels
      {
        id = 16;
        name = "Patna Comfort Inn";
        city = "Patna";
        description = "Budget-friendly stay near railway station";
        starRating = 3;
        pricePerNight = 699;
        amenities = ["WiFi", "AC"];
        address = "Station Road, Patna";
        imageIndex = 1;
      },
      {
        id = 17;
        name = "Mahadev Budget Hotel";
        city = "Patna";
        description = "Clean rooms near Patna Sahib";
        starRating = 2;
        pricePerNight = 549;
        amenities = ["WiFi"];
        address = "Patna Sahib, Patna";
        imageIndex = 2;
      },
      {
        id = 18;
        name = "Ganga View Lodge";
        city = "Patna";
        description = "River-facing rooms with city views";
        starRating = 4;
        pricePerNight = 1499;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Riverfront, Patna";
        imageIndex = 3;
      },
      {
        id = 19;
        name = "Capitol Hotel Patna";
        city = "Patna";
        description = "Premium suites in central Patna";
        starRating = 5;
        pricePerNight = 2499;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Central Patna, Patna";
        imageIndex = 4;
      },
      {
        id = 20;
        name = "Buddha Residency";
        city = "Gaya";
        description = "Near Mahabodhi Temple";
        starRating = 3;
        pricePerNight = 599;
        amenities = ["WiFi"];
        address = "Mahabodhi Temple, Gaya";
        imageIndex = 5;
      },
      {
        id = 21;
        name = "Lotus Inn Gaya";
        city = "Gaya";
        description = "Comfortable stay for pilgrims";
        starRating = 3;
        pricePerNight = 999;
        amenities = ["WiFi", "AC"];
        address = "Pilgrim Area, Gaya";
        imageIndex = 6;
      },
      {
        id = 22;
        name = "Hotel Siddharth";
        city = "Gaya";
        description = "Premium property near temple complex";
        starRating = 4;
        pricePerNight = 1799;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Temple Complex, Gaya";
        imageIndex = 7;
      },
      {
        id = 23;
        name = "Tirhut Lodge";
        city = "Muzaffarpur";
        description = "Affordable rooms in city center";
        starRating = 2;
        pricePerNight = 549;
        amenities = ["WiFi"];
        address = "City Center, Muzaffarpur";
        imageIndex = 8;
      },
      {
        id = 24;
        name = "Lychee Garden Hotel";
        city = "Muzaffarpur";
        description = "Known for hospitality and cleanliness";
        starRating = 3;
        pricePerNight = 999;
        amenities = ["WiFi", "AC"];
        address = "Central Square, Muzaffarpur";
        imageIndex = 9;
      },
      {
        id = 25;
        name = "North Bihar Suites";
        city = "Muzaffarpur";
        description = "Premium business hotel";
        starRating = 4;
        pricePerNight = 1999;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Business District, Muzaffarpur";
        imageIndex = 10;
      },
      {
        id = 26;
        name = "Jharkhand Inn";
        city = "Ranchi";
        description = "Budget stay near station";
        starRating = 2;
        pricePerNight = 749;
        amenities = ["WiFi"];
        address = "Station Area, Ranchi";
        imageIndex = 11;
      },
      {
        id = 27;
        name = "Forest View Hotel";
        city = "Ranchi";
        description = "Scenic views of Ranchi forests";
        starRating = 3;
        pricePerNight = 1199;
        amenities = ["WiFi", "AC"];
        address = "Forest Road, Ranchi";
        imageIndex = 12;
      },
      {
        id = 28;
        name = "Capital Residency";
        city = "Ranchi";
        description = "Upscale property in central Ranchi";
        starRating = 4;
        pricePerNight = 1999;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Central Ranchi, Ranchi";
        imageIndex = 13;
      },
      {
        id = 29;
        name = "Ranchi Grand";
        city = "Ranchi";
        description = "Premier five-star experience";
        starRating = 5;
        pricePerNight = 2299;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Luxury Sector, Ranchi";
        imageIndex = 14;
      },
      {
        id = 30;
        name = "Kashi Comfort";
        city = "Varanasi";
        description = "Spiritual stay near Ghats";
        starRating = 3;
        pricePerNight = 649;
        amenities = ["WiFi"];
        address = "Ghat Area, Varanasi";
        imageIndex = 15;
      },
      {
        id = 31;
        name = "Ganga Ghat Hotel";
        city = "Varanasi";
        description = "Overlooking the sacred Ganges";
        starRating = 4;
        pricePerNight = 1499;
        amenities = ["WiFi", "AC"];
        address = "Riverfront, Varanasi";
        imageIndex = 16;
      },
      {
        id = 32;
        name = "Benaras Heritage";
        city = "Varanasi";
        description = "Luxury hotel with Ghat views";
        starRating = 5;
        pricePerNight = 2799;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Heritage Area, Varanasi";
        imageIndex = 17;
      },
      {
        id = 33;
        name = "Awadh Budget Inn";
        city = "Lucknow";
        description = "Near Chowk area";
        starRating = 2;
        pricePerNight = 699;
        amenities = ["WiFi"];
        address = "Chowk, Lucknow";
        imageIndex = 18;
      },
      {
        id = 34;
        name = "Nawabi Residency";
        city = "Lucknow";
        description = "Classic Nawabi architecture";
        starRating = 4;
        pricePerNight = 1299;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Nawabi District, Lucknow";
        imageIndex = 1;
      },
      {
        id = 35;
        name = "Lucknow Grand";
        city = "Lucknow";
        description = "Luxury suites in heart of Lucknow";
        starRating = 5;
        pricePerNight = 1899;
        amenities = ["WiFi", "AC", "Parking"];
        address = "Heart of Lucknow";
        imageIndex = 2;
      },
    ];

    for (hotel in initialHotels.values()) {
      hotels.add(hotel.id, hotel);
    };
    nextHotelId := 36;
  };

  initializeHotels();

  func matchesQuery(hotel : Hotel, queryParams : HotelQueryParams) : Bool {
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

  public query ({ caller }) func searchHotels(queryParams : HotelQueryParams) : async [Hotel] {
    hotels.values().toArray().filter(func(h) { matchesQuery(h, queryParams) });
  };

  public query ({ caller }) func getHotel(id : Nat) : async Hotel {
    switch (hotels.get(id)) {
      case (null) { Runtime.trap("Hotel not found") };
      case (?hotel) { hotel };
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
      case (?_) {};
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
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view bookings");
    };

    let allBookings = bookings.values().toArray().filter(func(b) { b.guestEmail == email });

    if (AccessControl.isAdmin(accessControlState, caller)) {
      return allBookings;
    };

    allBookings.filter(func(b) { b.owner == caller });
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

  public shared ({ caller }) func approvePropertyListing(id : Nat) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admin can approve listings");
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
          status = #Approved;
          submittedAt = listing.submittedAt;
          submittedBy = listing.submittedBy;
        };
        propertyListings.add(id, updated);
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
};
