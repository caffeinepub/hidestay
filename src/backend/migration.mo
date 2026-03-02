import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

module {
  type OldActor = {
    userProfiles : Map.Map<Principal, { name : Text; email : Text; phone : Text }>;
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
    nextHotelId : Nat;
    nextBookingId : Nat;
  };

  type PropertyListing = {
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
  };

  type NewActor = {
    userProfiles : Map.Map<Principal, { name : Text; email : Text; phone : Text }>;
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
    propertyListings : Map.Map<Nat, PropertyListing>;
    nextHotelId : Nat;
    nextBookingId : Nat;
    nextPropertyListingId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      propertyListings = Map.empty<Nat, PropertyListing>();
      nextPropertyListingId = 1 : Nat;
    };
  };
};
