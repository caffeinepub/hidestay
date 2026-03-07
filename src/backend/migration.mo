import Map "mo:core/Map";
import Nat "mo:core/Nat";

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
    approvalStatus : {
      #Approved;
      #Pending;
      #Rejected;
    };
    rules : Text;
  };

  type NewHotel = {
    id : Nat;
    name : Text;
    city : Text;
    description : Text;
    starRating : Nat;
    pricePerNight : Int;
    amenities : [Text];
    address : Text;
    imageIndex : Nat;
    approvalStatus : {
      #Approved;
      #Pending;
      #Rejected;
    };
    rules : Text;
    imageUrls : [Text];
  };

  type OldActor = { hotels : Map.Map<Nat, OldHotel> };
  type NewActor = { hotels : Map.Map<Nat, NewHotel> };

  public func run(old : OldActor) : NewActor {
    let newHotels = old.hotels.map<Nat, OldHotel, NewHotel>(
      func(_st, oldHotel) {
        {
          id = oldHotel.id;
          name = oldHotel.name;
          city = oldHotel.city;
          description = oldHotel.description;
          starRating = oldHotel.starRating;
          pricePerNight = oldHotel.pricePerNight;
          amenities = oldHotel.amenities;
          address = oldHotel.address;
          imageIndex = oldHotel.imageIndex;
          approvalStatus = oldHotel.approvalStatus;
          rules = oldHotel.rules;
          imageUrls = [];
        };
      }
    );
    { hotels = newHotels };
  };
};
