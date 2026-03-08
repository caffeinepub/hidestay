import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Time "mo:core/Time";

module {
  // Add type definitions matching the actor state

  type OtpEntry = {
    code : Text;
    expiresAt : Int;
  };

  type CustomerProfile = {
    name : Text;
    email : Text;
    mobile : Text;
    passwordHash : Text;
    memberSince : Int;
  };

  type OldActor = {
    customerProfiles : Map.Map<Principal, CustomerProfile>;
    emailToPrincipal : Map.Map<Text, Principal>;
  };

  type NewActor = {
    customerProfiles : Map.Map<Principal, CustomerProfile>;
    emailToPrincipal : Map.Map<Text, Principal>;
    passwordResetOtps : Map.Map<Text, OtpEntry>;
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

  func initializeFromExistingProfile(customerProfiles : Map.Map<Principal, CustomerProfile>, emailToPrincipal : Map.Map<Text, Principal>) : Map.Map<Text, OtpEntry> {
    let firstProfile = customerProfiles.toArray()[0];
    let firstProfilePrincipal = firstProfile.0;
    let firstProfileData = firstProfile.1;
    let firstProfileEmail = firstProfileData.email;

    let otpCode = padToSixDigits((Int.abs(Time.now()) % 1_000_000).toText());
    let expiresAt = Time.now() + 600_000_000_000; // 10 min
    let otpEntry : OtpEntry = { code = otpCode; expiresAt };

    let map = Map.empty<Text, OtpEntry>();
    map.add(firstProfileEmail, otpEntry);
    map;
  };

  public func run(old : OldActor) : NewActor {
    let passwordResetOtps = initializeFromExistingProfile(old.customerProfiles, old.emailToPrincipal);
    {
      old with
      passwordResetOtps
    };
  };
};
