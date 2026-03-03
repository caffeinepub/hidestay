import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

module {
  type OldCustomerProfile = {
    name : Text;
    email : Text;
    passwordHash : Text;
    memberSince : Int;
  };

  type OldActor = {
    customerProfiles : Map.Map<Principal, OldCustomerProfile>;
    emailToPrincipal : Map.Map<Text, Principal>;
  };

  type NewCustomerProfile = {
    name : Text;
    email : Text;
    mobile : Text;
    passwordHash : Text;
    memberSince : Int;
  };

  type NewActor = {
    customerProfiles : Map.Map<Principal, NewCustomerProfile>;
    emailToPrincipal : Map.Map<Text, Principal>;
    mobileToPrincipal : Map.Map<Text, Principal>;
  };

  public func run(old : OldActor) : NewActor {
    let newCustomerProfiles = old.customerProfiles.map<Principal, OldCustomerProfile, NewCustomerProfile>(
      func(_principal, oldProfile) {
        { oldProfile with mobile = "" };
      }
    );

    let mobileToPrincipal = Map.empty<Text, Principal>();

    {
      customerProfiles = newCustomerProfiles;
      emailToPrincipal = old.emailToPrincipal;
      mobileToPrincipal;
    };
  };
};
