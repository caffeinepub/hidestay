import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  type UserProfile = {
    name : Text;
    email : Text;
    phone : Text;
  };

  type BlockedDate = {
    id : Nat;
    hotelId : Nat;
    date : Text;
    reason : Text;
  };

  type CustomerProfile = {
    name : Text;
    email : Text;
    passwordHash : Text;
    memberSince : Int;
  };

  type OldActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
    blockedDates : Map.Map<Nat, BlockedDate>;
  };

  type NewActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
    blockedDates : Map.Map<Nat, BlockedDate>;
    customerProfiles : Map.Map<Principal, CustomerProfile>;
    emailToPrincipal : Map.Map<Text, Principal>;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      customerProfiles = Map.empty<Principal, CustomerProfile>();
      emailToPrincipal = Map.empty<Text, Principal>();
    };
  };
};
