// src/constants/universities.js

export const NIGERIAN_UNIVERSITIES = [
  { value: "ui", label: "University of Ibadan" },
  { value: "unilag", label: "University of Lagos" },
  { value: "oau", label: "Obafemi Awolowo University" },
  { value: "uniben", label: "University of Benin" },
  { value: "futa", label: "Federal University of Technology, Akure" },
  { value: "unizik", label: "Nnamdi Azikiwe University" },
  { value: "lasu", label: "Lagos State University" },
  { value: "abu", label: "Ahmadu Bello University" },
  { value: "uniport", label: "University of Port Harcourt" },
];

/**
 * Resolves a raw string key (e.g., "ui") to its full official name string.
 * Gracefully provides a baseline fallback string if the node is undefined.
 */
export const getCampusFullName = (value) => {
  if (!value) return "Your Campus Node";
  const campus = NIGERIAN_UNIVERSITIES.find((uni) => uni.value.toLowerCase() === value.toLowerCase());
  return campus ? campus.label : `${value.toUpperCase()} Institutional Node`;
};