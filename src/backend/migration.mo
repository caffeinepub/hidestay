import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

module {
  type OtpEntry = {
    code : Text;
    expiresAt : Int;
  };

  type OldActor = {
    adminOtps : Map.Map<Principal, OtpEntry>;
    // ... other existing state ...
  };

  type NewActor = {
    adminOtps : Map.Map<Principal, OtpEntry>;
    adminLoginAttempts : Map.Map<Principal, Nat>;
    adminLockedAccounts : Map.Map<Principal, Bool>;
    // ... other existing state ...
  };

  public func run(old : OldActor) : NewActor {
    {
      adminOtps = old.adminOtps;
      adminLoginAttempts = Map.empty<Principal, Nat>();
      adminLockedAccounts = Map.empty<Principal, Bool>();
      // ... assign other existing fields ...
    };
  };
};
