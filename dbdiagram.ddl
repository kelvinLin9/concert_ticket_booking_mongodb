// User Model
Table User {
  _id ObjectId [pk]
  email String [unique, not null]
  password String [null]
  role String [not null, note: 'user, admin, superuser']
  phone String [null]
  birthday Date [null]
  gender String [null, note: 'male, female, other']
  preferredRegions String[] [null, note: 'north, south, east, central, offshore, overseas']
  preferredEventTypes String[] [null, note: 'pop, rock, electronic, hip-hop, jazz-blues, classical, other']
  country String [null]
  address String [null]
  avatar String [null]
  verificationToken String [null]
  verificationTokenExpires Date [null]
  isEmailVerified Boolean [not null, default: false]
  passwordResetToken String [null]
  passwordResetExpires Date [null]
  lastVerificationAttempt Date [null]
  createdAt DateTime [not null]
  updatedAt DateTime [not null]
  oauthProviders OAuthProvider[] [note: 'Embedded array of OAuth providers']
}

// OAuth Provider (Embedded in User)
Table OAuthProvider {
  provider String [not null, note: 'google']
  providerId String [not null]
  accessToken String [null]
  refreshToken String [null]
  tokenExpiresAt Date [null]
}

// Note: OAuthProvider is embedded within User document
// This is not a traditional relationship, but rather a nested document structure in MongoDB 