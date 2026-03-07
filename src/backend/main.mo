import Map "mo:core/Map";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";



actor {
  include MixinStorage();

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
    imageUrls : [Text];
    approvalStatus : HotelApprovalStatus;
    rules : Text;
    ownerEmail : Text;
    ownerPrincipal : Text;
    checkInTime : Text;
    checkOutTime : Text;
  };

  let hotels = Map.empty<Nat, Hotel>();
  let hotelOwners = Map.empty<Principal, Nat>();
  let roomInventory = Map.empty<Nat, RoomInventory>();
  let propertyListings = Map.empty<Nat, PropertyListing>();
  let bookings = Map.empty<Nat, Booking>();
  let blockedDates = Map.empty<Nat, BlockedDate>();
  let customerProfiles = Map.empty<Principal, CustomerProfile>();
  let emailToPrincipal = Map.empty<Text, Principal>();
  let mobileToPrincipal = Map.empty<Text, Principal>();
  let adminLockedAccounts = Map.empty<Principal, Bool>();
  let adminLoginAttempts = Map.empty<Principal, Nat>();
  let adminOtps = Map.empty<Principal, OtpEntry>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var nextHotelId = 26;
  var nextBookingId = 1;
  var nextPropertyListingId = 1;
  var nextBlockedDateId = 1;
  let MAX_ADMIN_LOGIN_ATTEMPTS : Nat = 5;

  func hasAllAmenities(hotelAmenities : [Text], required : [Text]) : Bool {
    let amenitySet = Set.fromArray(hotelAmenities);
    required.all(func(amenity) { amenitySet.contains(amenity) });
  };

  func isHotelOwner(caller : Principal) : Bool {
    switch (hotelOwners.get(caller)) {
      case (?_) { true };
      case (null) {
        let principalStr = caller.toText();
        hotels.values().toArray().any(func(h) { h.ownerPrincipal == principalStr });
      };
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

  func padToSixDigits(s : Text) : Text {
    let len = s.size();
    if (len >= 6) { return s };
    var pad = "";
    var i = len;
    while (i < 6) {
      pad := pad # "0";
      i += 1;
    };
    pad # s;
  };

  public type OtpEntry = {
    code : Text;
    expiresAt : Int;
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
    imageUrls : [Text];
    kycDocumentUrl : Text;
    rules : Text;
    checkInTime : Text;
    checkOutTime : Text;
  };

  public type PropertyListingStatus = {
    #PendingApproval;
    #Approved;
    #Rejected;
  };

  public type CustomerProfile = {
    name : Text;
    email : Text;
    mobile : Text;
    passwordHash : Text;
    memberSince : Int;
  };

  public type RoomInventory = {
    hotelId : Nat;
    roomType : Text;
    totalRooms : Nat;
    availableRooms : Nat;
  };

  public type HotelQueryParams = {
    city : ?Text;
    minPrice : ?Int;
    maxPrice : ?Int;
    amenities : ?[Text];
  };

  public type UserProfile = {
    name : Text;
    email : Text;
    phone : Text;
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

  public type BlockedDate = {
    id : Nat;
    hotelId : Nat;
    date : Text;
    reason : Text;
  };

  // Admin-only endpoint for direct hotel addition (V1.1)
  public shared ({ caller }) func addHotelAdmin(
    name : Text,
    city : Text,
    description : Text,
    starRating : Nat,
    pricePerNight : Int,
    amenities : [Text],
    address : Text,
    imageIndex : Nat,
    imageUrls : [Text],
    rules : Text,
    checkInTime : Text,
    checkOutTime : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can add hotels directly");
    };

    let hotelId = nextHotelId;
    let newHotel : Hotel = {
      id = hotelId;
      name;
      city;
      description;
      starRating;
      pricePerNight;
      amenities;
      address;
      imageIndex;
      imageUrls;
      approvalStatus = #Approved;
      rules;
      ownerEmail = "";
      ownerPrincipal = "";
      checkInTime;
      checkOutTime;
    };
    hotels.add(hotelId, newHotel);

    let inventory : RoomInventory = {
      hotelId;
      roomType = "Apartment";
      totalRooms = 10;
      availableRooms = 10;
    };
    roomInventory.add(hotelId, inventory);

    nextHotelId += 1;
    hotelId;
  };

  // New endpoint to get hotel image URLs
  public query func getHotelImageUrls(id : Nat) : async [Text] {
    switch (hotels.get(id)) {
      case (null) { Runtime.trap("Hotel not found") };
      case (?hotel) { hotel.imageUrls };
    };
  };

  // Public endpoints - no auth required
  public query func searchHotels(queryParams : HotelQueryParams) : async [Hotel] {
    hotels.values().toArray().filter(func(h) { matchesQuery(h, queryParams) });
  };

  public query func getHotel(id : Nat) : async Hotel {
    switch (hotels.get(id)) {
      case (null) { Runtime.trap("Hotel not found") };
      case (?hotel) { hotel };
    };
  };

  // Admin-only endpoints
  public query ({ caller }) func getHotelsForAdmin() : async [Hotel] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can view all hotels");
    };
    hotels.values().toArray();
  };

  public shared ({ caller }) func approveHotel(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
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
          imageUrls = hotel.imageUrls;
          approvalStatus = #Approved;
          rules = hotel.rules;
          ownerEmail = hotel.ownerEmail;
          ownerPrincipal = hotel.ownerPrincipal;
          checkInTime = hotel.checkInTime;
          checkOutTime = hotel.checkOutTime;
        };
        hotels.add(id, updatedHotel);
      };
    };
  };

  public shared ({ caller }) func rejectHotel(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
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
          imageUrls = hotel.imageUrls;
          approvalStatus = #Rejected;
          rules = hotel.rules;
          ownerEmail = hotel.ownerEmail;
          ownerPrincipal = hotel.ownerPrincipal;
          checkInTime = hotel.checkInTime;
          checkOutTime = hotel.checkOutTime;
        };
        hotels.add(id, updatedHotel);
      };
    };
  };

  public shared ({ caller }) func suspendHotel(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
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
          imageUrls = hotel.imageUrls;
          approvalStatus = #Rejected;
          rules = hotel.rules;
          ownerEmail = hotel.ownerEmail;
          ownerPrincipal = hotel.ownerPrincipal;
          checkInTime = hotel.checkInTime;
          checkOutTime = hotel.checkOutTime;
        };
        hotels.add(id, updatedHotel);
      };
    };
  };

  public query ({ caller }) func getBookingsByEmail(email : Text) : async [Booking] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can view bookings by email");
    };
    bookings.values().toArray().filter(func(b) { b.guestEmail == email });
  };

  public query ({ caller }) func getAllBookings() : async [Booking] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can view all bookings");
    };
    bookings.values().toArray();
  };

  public shared ({ caller }) func approvePropertyListing(listingId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
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
          imageUrls = listing.imageUrls;
          approvalStatus = #Approved;
          rules = listing.rules;
          ownerEmail = listing.ownerEmail;
          ownerPrincipal = listing.submittedBy.toText();
          checkInTime = listing.checkInTime;
          checkOutTime = listing.checkOutTime;
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
          imageUrls = listing.imageUrls;
          kycDocumentUrl = listing.kycDocumentUrl;
          rules = listing.rules;
          checkInTime = listing.checkInTime;
          checkOutTime = listing.checkOutTime;
        };
        propertyListings.add(listingId, updatedListing);
      };
    };
  };

  public shared ({ caller }) func rejectPropertyListing(listingId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can reject listings");
    };

    switch (propertyListings.get(listingId)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?listing) {
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
          status = #Rejected;
          submittedAt = listing.submittedAt;
          submittedBy = listing.submittedBy;
          imageUrls = listing.imageUrls;
          kycDocumentUrl = listing.kycDocumentUrl;
          rules = listing.rules;
          checkInTime = listing.checkInTime;
          checkOutTime = listing.checkOutTime;
        };
        propertyListings.add(listingId, updatedListing);
      };
    };
  };

  public query ({ caller }) func getKycDocumentUrl(listingId : Nat) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can view KYC documents");
    };

    switch (propertyListings.get(listingId)) {
      case (null) { Runtime.trap("Listing not found") };
      case (?listing) { listing.kycDocumentUrl };
    };
  };

  public query ({ caller }) func getPropertyListings() : async [PropertyListing] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can view all property listings");
    };
    propertyListings.values().toArray();
  };

  public shared ({ caller }) func assignHotelOwner(user : Principal, hotelId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can assign hotel owners");
    };

    switch (hotels.get(hotelId)) {
      case (null) { Runtime.trap("Hotel not found") };
      case (?_) {
        hotelOwners.add(user, hotelId);
      };
    };
  };

  public shared ({ caller }) func revokeHotelOwner(user : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can revoke hotel owners");
    };

    hotelOwners.remove(user);
  };

  public shared ({ caller }) func generateAdminOtp() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can generate OTP");
    };

    switch (adminLockedAccounts.get(caller)) {
      case (?true) { Runtime.trap("Account is locked due to too many failed attempts") };
      case (_) {};
    };

    let randomNano = Int.abs(Time.now());
    let codeNat = randomNano % 1_000_000;
    let code = padToSixDigits(codeNat.toText());
    let expiresAt = Time.now() + 300_000_000_000;
    let entry : OtpEntry = { code; expiresAt };
    adminOtps.add(caller, entry);
    code;
  };

  public shared ({ caller }) func verifyAdminOtp(code : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can verify OTP");
    };

    switch (adminLockedAccounts.get(caller)) {
      case (?true) { Runtime.trap("Account is locked due to too many failed attempts") };
      case (_) {};
    };

    switch (adminOtps.get(caller)) {
      case (null) {
        let attempts = switch (adminLoginAttempts.get(caller)) {
          case (null) { 1 };
          case (?n) { n + 1 };
        };
        adminLoginAttempts.add(caller, attempts);
        if (attempts >= MAX_ADMIN_LOGIN_ATTEMPTS) {
          adminLockedAccounts.add(caller, true);
        };
        return false;
      };
      case (?entry) {
        if (Time.now() > entry.expiresAt) {
          adminOtps.remove(caller);
          let attempts = switch (adminLoginAttempts.get(caller)) {
            case (null) { 1 };
            case (?n) { n + 1 };
          };
          adminLoginAttempts.add(caller, attempts);
          if (attempts >= MAX_ADMIN_LOGIN_ATTEMPTS) {
            adminLockedAccounts.add(caller, true);
          };
          return false;
        };

        if (entry.code == code) {
          adminOtps.remove(caller);
          adminLoginAttempts.remove(caller);
          return true;
        } else {
          let attempts = switch (adminLoginAttempts.get(caller)) {
            case (null) { 1 };
            case (?n) { n + 1 };
          };
          adminLoginAttempts.add(caller, attempts);
          if (attempts >= MAX_ADMIN_LOGIN_ATTEMPTS) {
            adminLockedAccounts.add(caller, true);
          };
          return false;
        };
      };
    };
  };

  public query ({ caller }) func getAdminLockStatus() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can check lock status");
    };

    switch (adminLockedAccounts.get(caller)) {
      case (?true) { true };
      case (_) { false };
    };
  };

  public shared ({ caller }) func unlockAdminAccount() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can unlock accounts");
    };

    adminLockedAccounts.remove(caller);
    adminLoginAttempts.remove(caller);
    adminOtps.remove(caller);
  };

  // User-only endpoints
  public shared ({ caller }) func createBooking(
    hotelId : Nat,
    guestName : Text,
    guestEmail : Text,
    phone : Text,
    checkIn : Text,
    checkOut : Text,
    guestCount : Nat,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create bookings");
    };

    switch (roomInventory.get(hotelId)) {
      case (null) { Runtime.trap("Room inventory not found") };
      case (?inventory) {
        if (inventory.availableRooms == 0) {
          Runtime.trap("No rooms available");
        };

        let bookingId = nextBookingId;
        let booking : Booking = {
          id = bookingId;
          hotelId;
          guestName;
          guestEmail;
          phone;
          checkIn;
          checkOut;
          guestCount;
          status = #Pending;
          created = Time.now();
          owner = caller;
        };
        bookings.add(bookingId, booking);
        nextBookingId += 1;

        let updatedInventory : RoomInventory = {
          hotelId = inventory.hotelId;
          roomType = inventory.roomType;
          totalRooms = inventory.totalRooms;
          availableRooms = inventory.availableRooms - 1;
        };
        roomInventory.add(hotelId, updatedInventory);

        bookingId;
      };
    };
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
        if (booking.owner != caller) {
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
            let updatedInventory : RoomInventory = {
              hotelId = inventory.hotelId;
              roomType = inventory.roomType;
              totalRooms = inventory.totalRooms;
              availableRooms = inventory.availableRooms + 1;
            };
            roomInventory.add(booking.hotelId, updatedInventory);
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
    imageUrls : [Text],
    kycDocumentUrl : Text,
    rules : Text,
    checkInTime : Text,
    checkOutTime : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit property listings");
    };

    let listingId = nextPropertyListingId;
    let listing : PropertyListing = {
      id = listingId;
      ownerName;
      ownerPhone;
      ownerEmail;
      hotelName;
      city;
      address;
      pricePerNight;
      roomType;
      amenities;
      description;
      subscriptionPlan;
      status = #PendingApproval;
      submittedAt;
      submittedBy = caller;
      imageUrls;
      kycDocumentUrl;
      rules;
      checkInTime;
      checkOutTime;
    };
    propertyListings.add(listingId, listing);
    nextPropertyListingId += 1;
    listingId;
  };

  public query ({ caller }) func getMyPropertyListings() : async [PropertyListing] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their property listings");
    };

    propertyListings.values().toArray().filter(func(l) { l.submittedBy == caller });
  };

  public query ({ caller }) func getMyBookings() : async [Booking] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their bookings");
    };

    let userBookings = bookings.values().toArray().filter(func(b) { b.owner == caller });
    userBookings.sort(func(a : Booking, b : Booking) : Order.Order {
      if (a.created > b.created) { #less } else if (a.created < b.created) { #greater } else { #equal };
    });
  };

  public query ({ caller }) func isCallerHotelOwner() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check hotel owner status");
    };
    isHotelOwner(caller);
  };

  // User profile endpoints
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
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

  // Customer profile endpoints
  public shared ({ caller }) func registerCustomer(
    name : Text,
    email : Text,
    mobile : Text,
    passwordHash : Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can register");
    };

    switch (emailToPrincipal.get(email)) {
      case (?_) { Runtime.trap("Email already registered") };
      case (null) {};
    };

    switch (mobileToPrincipal.get(mobile)) {
      case (?_) { Runtime.trap("Mobile already registered") };
      case (null) {};
    };

    let profile : CustomerProfile = {
      name;
      email;
      mobile;
      passwordHash;
      memberSince = Time.now();
    };
    customerProfiles.add(caller, profile);
    emailToPrincipal.add(email, caller);
    mobileToPrincipal.add(mobile, caller);
  };

  public query func loginCustomer(email : Text, passwordHash : Text) : async Bool {
    switch (emailToPrincipal.get(email)) {
      case (null) { false };
      case (?principal) {
        switch (customerProfiles.get(principal)) {
          case (null) { false };
          case (?profile) { profile.passwordHash == passwordHash };
        };
      };
    };
  };

  public shared ({ caller }) func updateCustomerProfile(
    name : Text,
    email : Text,
    mobile : Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update profiles");
    };

    switch (customerProfiles.get(caller)) {
      case (null) { Runtime.trap("Profile not found") };
      case (?profile) {
        if (profile.email != email) {
          switch (emailToPrincipal.get(email)) {
            case (?_) { Runtime.trap("Email already in use") };
            case (null) {
              emailToPrincipal.remove(profile.email);
              emailToPrincipal.add(email, caller);
            };
          };
        };

        if (profile.mobile != mobile) {
          switch (mobileToPrincipal.get(mobile)) {
            case (?_) { Runtime.trap("Mobile already in use") };
            case (null) {
              mobileToPrincipal.remove(profile.mobile);
              mobileToPrincipal.add(mobile, caller);
            };
          };
        };

        let updatedProfile : CustomerProfile = {
          name;
          email;
          mobile;
          passwordHash = profile.passwordHash;
          memberSince = profile.memberSince;
        };
        customerProfiles.add(caller, updatedProfile);
      };
    };
  };

  public shared ({ caller }) func changeCustomerPassword(newPasswordHash : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can change passwords");
    };

    switch (customerProfiles.get(caller)) {
      case (null) { Runtime.trap("Profile not found") };
      case (?profile) {
        let updatedProfile : CustomerProfile = {
          name = profile.name;
          email = profile.email;
          mobile = profile.mobile;
          passwordHash = newPasswordHash;
          memberSince = profile.memberSince;
        };
        customerProfiles.add(caller, updatedProfile);
      };
    };
  };

  public query ({ caller }) func getCustomerProfile() : async ?CustomerProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view customer profiles");
    };
    customerProfiles.get(caller);
  };

  // Hotel owner endpoints
  public shared ({ caller }) func getOwnerHotel() : async Hotel {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only hotel owners can access this");
    };

    switch (hotelOwners.get(caller)) {
      case (?hotelId) {
        switch (hotels.get(hotelId)) {
          case (null) { Runtime.trap("Hotel not found") };
          case (?hotel) { hotel };
        };
      };
      case (null) {
        let principalStr = caller.toText();
        let ownedHotel = hotels.values().toArray().find(func(h) { h.ownerPrincipal == principalStr });
        switch (ownedHotel) {
          case (null) { Runtime.trap("Unauthorized: Only hotel owners can access this") };
          case (?hotel) {
            hotelOwners.add(caller, hotel.id);
            return hotel;
          };
        };
      };
    };
  };

  public query ({ caller }) func getOwnerBookings() : async [Booking] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only hotel owners can access this");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can access this");
    };

    switch (hotelOwners.get(caller)) {
      case (null) { Runtime.trap("No hotel associated with caller") };
      case (?hotelId) {
        let ownerBookings = bookings.values().toArray().filter(func(b) { b.hotelId == hotelId });
        ownerBookings.sort(func(a : Booking, b : Booking) : Order.Order {
          if (a.created > b.created) { #less } else if (a.created < b.created) { #greater } else { #equal };
        });
      };
    };
  };

  // Admin-only endpoint to get a hotel by owner email
  public query ({ caller }) func getOwnerHotelByEmail(email : Text) : async Hotel {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admin can use this endpoint");
    };
    switch (hotels.values().toArray().find(func(h) { h.ownerEmail == email })) {
      case (?hotel) { hotel };
      case (null) { Runtime.trap("Hotel not found for this owner email") };
    };
  };

  public shared ({ caller }) func updateBookingStatus(bookingId : Nat, newStatus : Status) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only hotel owners can update booking status");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can update booking status");
    };

    switch (hotelOwners.get(caller)) {
      case (null) { Runtime.trap("No hotel associated with caller") };
      case (?hotelId) {
        switch (bookings.get(bookingId)) {
          case (null) { Runtime.trap("Booking not found") };
          case (?booking) {
            if (booking.hotelId != hotelId) {
              Runtime.trap("Unauthorized: Booking does not belong to your hotel");
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
                var availableChange = 0;
                switch (oldStatus, newStatus) {
                  case (#Pending, #Cancelled) { availableChange := 1 };
                  case (#Confirmed, #Cancelled) { availableChange := 1 };
                  case (_) {};
                };

                if (availableChange > 0) {
                  let updatedInventory : RoomInventory = {
                    hotelId = inventory.hotelId;
                    roomType = inventory.roomType;
                    totalRooms = inventory.totalRooms;
                    availableRooms = inventory.availableRooms + 1;
                  };
                  roomInventory.add(hotelId, updatedInventory);
                };
              };
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func getOwnerRoomInventory() : async RoomInventory {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only hotel owners can access this");
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

  public shared ({ caller }) func updateRoomInventory(totalRooms : Nat, availableRooms : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only hotel owners can update inventory");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can update inventory");
    };

    switch (hotelOwners.get(caller)) {
      case (null) { Runtime.trap("No hotel associated with caller") };
      case (?hotelId) {
        switch (roomInventory.get(hotelId)) {
          case (null) { Runtime.trap("Room inventory not found") };
          case (?inventory) {
            let updatedInventory : RoomInventory = {
              hotelId = inventory.hotelId;
              roomType = inventory.roomType;
              totalRooms;
              availableRooms;
            };
            roomInventory.add(hotelId, updatedInventory);
          };
        };
      };
    };
  };

  public query ({ caller }) func getBlockedDates() : async [BlockedDate] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only hotel owners can access blocked dates");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can access blocked dates");
    };

    switch (hotelOwners.get(caller)) {
      case (null) { Runtime.trap("No hotel associated with caller") };
      case (?hotelId) {
        blockedDates.values().toArray().filter(func(bd) { bd.hotelId == hotelId });
      };
    };
  };

  public shared ({ caller }) func blockDate(date : Text, reason : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only hotel owners can block dates");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can block dates");
    };

    switch (hotelOwners.get(caller)) {
      case (null) { Runtime.trap("No hotel associated with caller") };
      case (?hotelId) {
        let blockedDateId = nextBlockedDateId;
        let blockedDate : BlockedDate = {
          id = blockedDateId;
          hotelId;
          date;
          reason;
        };
        blockedDates.add(blockedDateId, blockedDate);
        nextBlockedDateId += 1;
        blockedDateId;
      };
    };
  };

  public shared ({ caller }) func unblockDate(blockedDateId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only hotel owners can unblock dates");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can unblock dates");
    };

    switch (hotelOwners.get(caller)) {
      case (null) { Runtime.trap("No hotel associated with caller") };
      case (?hotelId) {
        switch (blockedDates.get(blockedDateId)) {
          case (null) { Runtime.trap("Blocked date not found") };
          case (?blockedDate) {
            if (blockedDate.hotelId != hotelId) {
              Runtime.trap("Unauthorized: Blocked date does not belong to your hotel");
            };
            blockedDates.remove(blockedDateId);
          };
        };
      };
    };
  };

  public shared ({ caller }) func updateHotelRules(rules : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only hotel owners can update rules");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can update rules");
    };

    switch (hotelOwners.get(caller)) {
      case (null) { Runtime.trap("No hotel associated with caller") };
      case (?hotelId) {
        switch (hotels.get(hotelId)) {
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
              imageUrls = hotel.imageUrls;
              approvalStatus = hotel.approvalStatus;
              rules;
              ownerEmail = hotel.ownerEmail;
              ownerPrincipal = hotel.ownerPrincipal;
              checkInTime = hotel.checkInTime;
              checkOutTime = hotel.checkOutTime;
            };
            hotels.add(hotelId, updatedHotel);
          };
        };
      };
    };
  };

  public shared ({ caller }) func updateHotelTimes(checkInTime : Text, checkOutTime : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only hotel owners can update times");
    };

    if (not isHotelOwner(caller)) {
      Runtime.trap("Unauthorized: Only hotel owners can update times");
    };

    switch (hotelOwners.get(caller)) {
      case (null) { Runtime.trap("No hotel associated with caller") };
      case (?hotelId) {
        switch (hotels.get(hotelId)) {
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
              imageUrls = hotel.imageUrls;
              approvalStatus = hotel.approvalStatus;
              rules = hotel.rules;
              ownerEmail = hotel.ownerEmail;
              ownerPrincipal = hotel.ownerPrincipal;
              checkInTime;
              checkOutTime;
            };
            hotels.add(hotelId, updatedHotel);
          };
        };
      };
    };
  };
};
