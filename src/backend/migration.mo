import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

module {
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
    status : OldPropertyListingStatus;
    submittedAt : Int;
    submittedBy : Principal.Principal;
    imageUrls : [Text];
  };

  type OldPropertyListingStatus = {
    #PendingApproval;
    #Approved;
    #Rejected;
  };

  type OldActor = {
    propertyListings : Map.Map<Nat, OldPropertyListing>;
  };

  type NewPropertyListing = {
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
    status : OldPropertyListingStatus;
    submittedAt : Int;
    submittedBy : Principal.Principal;
    imageUrls : [Text];
    kycDocumentUrl : Text;
  };

  type NewActor = {
    propertyListings : Map.Map<Nat, NewPropertyListing>;
  };

  public func run(old : OldActor) : NewActor {
    let newListings = old.propertyListings.map<Nat, OldPropertyListing, NewPropertyListing>(
      func(_id, oldListing) {
        { oldListing with kycDocumentUrl = "" };
      }
    );
    { propertyListings = newListings };
  };
};
