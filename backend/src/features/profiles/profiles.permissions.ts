import { RelationshipStatus } from "../relationships/relationship.service";

export const canViewProfile = (status: RelationshipStatus) => {
  return status !== "none";
};
