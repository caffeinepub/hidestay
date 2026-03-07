import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

module {
  type OldHotel = {
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
    approvalStatus : {
      #Approved;
      #Pending;
      #Rejected;
    };
    rules : Text;
    ownerEmail : Text;
    ownerPrincipal : Text;
  };

  type OldPropertyListing = {
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
    status : {
      #PendingApproval;
      #Approved;
      #Rejected;
    };
    submittedAt : Int;
    submittedBy : Principal;
    imageUrls : [Text];
    kycDocumentUrl : Text;
    rules : Text;
  };

  type OldActor = {
    hotels : Map.Map<Nat, OldHotel>;
    propertyListings : Map.Map<Nat, OldPropertyListing>;
    hotelOwners : Map.Map<Principal, Nat>;
    roomInventory : Map.Map<Nat, {
      hotelId : Nat;
      roomType : Text;
      totalRooms : Nat;
      availableRooms : Nat;
    }>;
    bookings : Map.Map<Nat, {
      id : Nat;
      hotelId : Nat;
      guestName : Text;
      guestEmail : Text;
      phone : Text;
      checkIn : Text;
      checkOut : Text;
      guestCount : Nat;
      status : {
        #Confirmed;
        #Pending;
        #Cancelled;
      };
      created : Int;
      owner : Principal;
    }>;
    blockedDates : Map.Map<Nat, {
      id : Nat;
      hotelId : Nat;
      date : Text;
      reason : Text;
    }>;
    customerProfiles : Map.Map<Principal, {
      name : Text;
      email : Text;
      mobile : Text;
      passwordHash : Text;
      memberSince : Int;
    }>;
    emailToPrincipal : Map.Map<Text, Principal>;
    mobileToPrincipal : Map.Map<Text, Principal>;
    adminLockedAccounts : Map.Map<Principal, Bool>;
    adminLoginAttempts : Map.Map<Principal, Nat>;
    adminOtps : Map.Map<Principal, {
      code : Text;
      expiresAt : Int;
    }>;
    userProfiles : Map.Map<Principal, {
      name : Text;
      email : Text;
      phone : Text;
    }>;
    nextHotelId : Nat;
    nextBookingId : Nat;
    nextPropertyListingId : Nat;
    nextBlockedDateId : Nat;
    MAX_ADMIN_LOGIN_ATTEMPTS : Nat;
  };

  type NewActor = {
    hotels : Map.Map<Nat, {
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
      approvalStatus : {
        #Approved;
        #Pending;
        #Rejected;
      };
      rules : Text;
      ownerEmail : Text;
      ownerPrincipal : Text;
      checkInTime : Text;
      checkOutTime : Text;
    }>;
    propertyListings : Map.Map<Nat, {
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
      status : {
        #PendingApproval;
        #Approved;
        #Rejected;
      };
      submittedAt : Int;
      submittedBy : Principal;
      imageUrls : [Text];
      kycDocumentUrl : Text;
      rules : Text;
      checkInTime : Text;
      checkOutTime : Text;
    }>;
    hotelOwners : Map.Map<Principal, Nat>;
    roomInventory : Map.Map<Nat, {
      hotelId : Nat;
      roomType : Text;
      totalRooms : Nat;
      availableRooms : Nat;
    }>;
    bookings : Map.Map<Nat, {
      id : Nat;
      hotelId : Nat;
      guestName : Text;
      guestEmail : Text;
      phone : Text;
      checkIn : Text;
      checkOut : Text;
      guestCount : Nat;
      status : {
        #Confirmed;
        #Pending;
        #Cancelled;
      };
      created : Int;
      owner : Principal;
    }>;
    blockedDates : Map.Map<Nat, {
      id : Nat;
      hotelId : Nat;
      date : Text;
      reason : Text;
    }>;
    customerProfiles : Map.Map<Principal, {
      name : Text;
      email : Text;
      mobile : Text;
      passwordHash : Text;
      memberSince : Int;
    }>;
    emailToPrincipal : Map.Map<Text, Principal>;
    mobileToPrincipal : Map.Map<Text, Principal>;
    adminLockedAccounts : Map.Map<Principal, Bool>;
    adminLoginAttempts : Map.Map<Principal, Nat>;
    adminOtps : Map.Map<Principal, {
      code : Text;
      expiresAt : Int;
    }>;
    userProfiles : Map.Map<Principal, {
      name : Text;
      email : Text;
      phone : Text;
    }>;
    nextHotelId : Nat;
    nextBookingId : Nat;
    nextPropertyListingId : Nat;
    nextBlockedDateId : Nat;
    MAX_ADMIN_LOGIN_ATTEMPTS : Nat;
  };

  public func run(old : OldActor) : NewActor {
    let newHotels = old.hotels.map<Nat, OldHotel, {
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
      approvalStatus : {
        #Approved;
        #Pending;
        #Rejected;
      };
      rules : Text;
      ownerEmail : Text;
      ownerPrincipal : Text;
      checkInTime : Text;
      checkOutTime : Text;
    }>(func(_, oldHotel) {
      {
        oldHotel with
        checkInTime = "12:00 PM";
        checkOutTime = "11:00 AM";
      };
    });

    let newPropertyListings = old.propertyListings.map<Nat, OldPropertyListing, {
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
      status : {
        #PendingApproval;
        #Approved;
        #Rejected;
      };
      submittedAt : Int;
      submittedBy : Principal;
      imageUrls : [Text];
      kycDocumentUrl : Text;
      rules : Text;
      checkInTime : Text;
      checkOutTime : Text;
    }>(func(_, oldListing) {
      {
        oldListing with
        checkInTime = "12:00 PM";
        checkOutTime = "11:00 AM";
      };
    });

    {
      old with
      hotels = newHotels;
      propertyListings = newPropertyListings;
    };
  };
};
