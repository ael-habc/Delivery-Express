export const DEFAULT_LOGIN_PASSWORD = "delivery123";
export const APP_ROLES = {
  ADMIN: "ADMIN",
  DELIVERY: "DELIVERY",
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export type DefaultAppUser = {
  name: string;
  email: string;
  role: AppRole;
  legacyEmails?: string[];
  legacyNames?: string[];
};

export const DEFAULT_APP_USERS: readonly DefaultAppUser[] = [
  {
    name: "Adnan",
    email: "adnan@delivery.local",
    role: APP_ROLES.ADMIN,
  },
  {
    name: "Chaimaa",
    email: "chaimaa@delivery.local",
    role: APP_ROLES.ADMIN,
  },
  {
    name: "Yahya",
    email: "yahya@delivery.local",
    role: APP_ROLES.ADMIN,
  },
  {
    name: "Abdellah",
    email: "abdellah@delivery.local",
    role: APP_ROLES.ADMIN,
  },
  {
    name: "Hamza",
    email: "hamza@delivery.local",
    role: APP_ROLES.DELIVERY,
    legacyEmails: ["hamza@delivery.local"],
    legacyNames: ["Hamza"],
  },
  {
    name: "Othaman",
    email: "othaman@delivery.local",
    role: APP_ROLES.DELIVERY,
    legacyEmails: ["othman@delivery.local"],
    legacyNames: ["Othman"],
  },
  {
    name: "Test Delivery",
    email: "test-delivery@delivery.local",
    role: APP_ROLES.DELIVERY,
    legacyEmails: ["test-delivery@delivery.local"],
    legacyNames: ["Test Delivery"],
  },
  {
    name: "Test Admin",
    email: "test-admin@delivery.local",
    role: APP_ROLES.ADMIN,
    legacyEmails: ["test-admin@delivery.local"],
    legacyNames: ["Test Admin"],
  }
] as const;
