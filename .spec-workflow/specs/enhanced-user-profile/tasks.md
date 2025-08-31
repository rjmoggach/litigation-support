# Tasks Document

## Phase 1: Backend Model Extensions and Marriages App

- [x] 1. Extend Person model with personal information fields
  - File: backend/contacts/models.py
  - Add date_of_birth (Date, nullable=True)
  - Add gender (String(50), nullable=True)
  - Purpose: Add personal info fields needed for legal proceedings
  - _Leverage: Existing Person model structure and validation patterns_
  - _Requirements: 1.1, 1.4_

- [x] 2. Extend PersonProfile model for legal-specific information
  - File: backend/contacts/models.py (continue from task 1)
  - Add ssn_last_four (String(4), nullable=True, encrypted)
  - Add preferred_name (String(100), nullable=True)
  - Add emergency_contact (JSON, nullable=True)
  - Purpose: Additional profile fields for legal context
  - _Leverage: Existing PersonProfile structure_
  - _Requirements: 1.1_

- [x] 3. Create PersonAddress model for historical address tracking
  - File: backend/contacts/models.py (continue from task 2)
  - Create PersonAddress table with temporal fields
  - Add relationship to Person model
  - Include effective_start_date, effective_end_date, is_current fields
  - Purpose: Track address history for all persons (users, spouses, children)
  - _Leverage: Existing model patterns, JSON fields from contacts_
  - _Requirements: 1.2, 1.5_

- [x] 4. Augment UserProfile model with person relationship
  - File: backend/users/models.py
  - Add person_id (ForeignKey to people.id, nullable=True)
  - Add person relationship
  - Add marriages relationship (viewonly to Marriage model)
  - Purpose: Link user profiles to Person records for family relationships
  - _Leverage: Existing UserProfile structure_
  - _Requirements: 1.6_

- [x] 5. Create marriages app directory structure
  - Directory: backend/marriages/
  - Create __init__.py, models.py, schemas.py, api.py, services.py, deps.py
  - Purpose: Establish new domain module for marriage management
  - _Leverage: Existing app structure patterns from users, contacts_
  - _Requirements: 2.1_

- [x] 6. Create Marriage model in marriages app
  - File: backend/marriages/models.py
  - Define Marriage table with person_id, spouse_id foreign keys
  - Add marriage_date, separation_date, divorce_date fields
  - Add marriage_location (JSON), current_status fields
  - Add unique constraints and indexes
  - Purpose: Track marriage relationships with full timeline
  - _Leverage: Association patterns from contacts/models.py_
  - _Requirements: 2.2, 2.4_

- [x] 7. Create MarriageChildren association model
  - File: backend/marriages/models.py (continue from task 6)
  - Define MarriageChildren table with composite primary key
  - Add custody_status, custody_details, current_living_with fields
  - Add relationships to Marriage and Person (child)
  - Purpose: Associate children with marriages and track custody info
  - _Leverage: CompanyPersonAssociation pattern from contacts_
  - _Requirements: 2.3_

- [x] 8. Create database migrations for all model changes
  - File: backend/alembic/versions/[timestamp]_enhance_user_profile.py
  - Add columns to existing person, person_profiles, user_profiles tables
  - Create new person_addresses, marriages, marriage_children tables
  - Add foreign key constraints and indexes
  - Purpose: Database schema changes for enhanced profile support
  - _Leverage: Existing migration patterns in alembic/versions/_
  - _Requirements: All Phase 1_

## Phase 2: Backend Schemas and API Development

- [ ] 9. Extend Person schemas with new fields
  - File: backend/contacts/schemas.py
  - Update PersonBase, PersonCreate, PersonUpdate schemas
  - Add validation for date_of_birth, gender fields
  - Purpose: API serialization support for extended Person model
  - _Leverage: Existing Pydantic patterns in contacts/schemas.py_
  - _Requirements: 1.1_

- [ ] 10. Create PersonAddress schemas
  - File: backend/contacts/schemas.py (continue from task 9)
  - Create PersonAddressBase, PersonAddressCreate, PersonAddressUpdate
  - Add PersonAddressResponse with temporal field validation
  - Purpose: API support for address history management
  - _Leverage: Existing validation patterns_
  - _Requirements: 1.2, 1.5_

- [ ] 11. Update UserProfile schemas with person relationship
  - File: backend/users/schemas.py
  - Update UserProfileResponse to include person relationship
  - Add optional person_id field to update schemas
  - Purpose: API support for user-person linking
  - _Leverage: Existing UserProfile schema patterns_
  - _Requirements: 1.6_

- [ ] 12. Create Marriage schemas in marriages app
  - File: backend/marriages/schemas.py
  - Create MarriageBase, MarriageCreate, MarriageUpdate schemas
  - Add MarriageResponse with full person/spouse details
  - Add date validation for marriage timeline (marriage before separation before divorce)
  - Purpose: API serialization for marriage data
  - _Leverage: Date validation patterns from existing schemas_
  - _Requirements: 2.2, 2.4_

- [ ] 13. Create MarriageChildren schemas
  - File: backend/marriages/schemas.py (continue from task 12)
  - Create MarriageChildrenBase, MarriageChildrenCreate schemas
  - Add MarriageChildrenResponse with child person details
  - Add custody status validation
  - Purpose: API support for marriage-children associations
  - _Leverage: Association schema patterns from contacts_
  - _Requirements: 2.3_

- [ ] 14. Create marriages API endpoints
  - File: backend/marriages/api.py
  - Implement CRUD endpoints for Marriage model
  - Add GET /marriages/user/{user_id} for user's marriages
  - Add marriage timeline validation in endpoints
  - Purpose: API access to marriage management
  - _Leverage: Existing API patterns from users/api.py, contacts/api.py_
  - _Requirements: 2.2, 2.4_

- [ ] 15. Create marriage children API endpoints
  - File: backend/marriages/api.py (continue from task 14)
  - Implement endpoints for MarriageChildren associations
  - Add GET /marriages/{marriage_id}/children
  - Add custody status update endpoints
  - Purpose: API access to children associations
  - _Leverage: Association API patterns_
  - _Requirements: 2.3_

- [ ] 16. Create marriages service layer
  - File: backend/marriages/services.py
  - Implement business logic for marriage CRUD operations
  - Add family tree resolution methods
  - Add validation for marriage timeline consistency
  - Purpose: Business logic layer for marriage operations
  - _Leverage: Service patterns from users/services.py_
  - _Requirements: 2.2, 2.4_

- [ ] 17. Extend Person API with address management
  - File: backend/contacts/api.py
  - Add endpoints for PersonAddress CRUD operations
  - Add GET /people/{person_id}/addresses/current
  - Add address timeline validation
  - Purpose: API access to person address history
  - _Leverage: Existing contacts API patterns_
  - _Requirements: 1.2, 1.5_

## Phase 3: Frontend Components and Integration

- [ ] 18. Create enhanced profile form sections
  - File: frontend/src/app/(site)/profile/_components/profile-form.tsx
  - Extend existing ProfileForm with personal information section
  - Add date of birth, phone number fields
  - Purpose: Collect basic personal information in user profile
  - _Leverage: Existing ProfileForm structure, Input/Label components_
  - _Requirements: 1.1, 1.6_

- [ ] 19. Create AddressManager component
  - File: frontend/src/components/profile/address-manager.tsx
  - Create component for managing address history
  - Add current address display and address history list
  - Add forms for adding/editing addresses with date ranges
  - Purpose: Manage user's address history
  - _Leverage: Card components, existing form patterns_
  - _Requirements: 1.2, 1.5_

- [ ] 20. Create MarriageManager component
  - File: frontend/src/components/profile/marriage-manager.tsx
  - Create component for managing marriage information
  - Add marriage timeline display (marriage, separation, divorce dates)
  - Add forms for creating/editing marriages
  - Purpose: Manage user's marriage history
  - _Leverage: Card components, date picker components_
  - _Requirements: 2.2, 2.4_

- [ ] 21. Create SpouseSelector component
  - File: frontend/src/components/profile/spouse-selector.tsx
  - Create component to search/select existing Person or create new
  - Add Person creation form for new spouses
  - Add spouse information display and editing
  - Purpose: Link spouses to marriages from Person records
  - _Leverage: Search components, Person management patterns_
  - _Requirements: 2.2_

- [ ] 22. Create ChildrenManager component
  - File: frontend/src/components/profile/children-manager.tsx
  - Create component for managing children associations
  - Add children list with custody information
  - Add forms for associating children with marriages
  - Purpose: Manage marriage-children relationships
  - _Leverage: Card components, association patterns_
  - _Requirements: 2.3_

- [ ] 23. Create PersonForm component
  - File: frontend/src/components/profile/person-form.tsx
  - Create reusable form for Person data entry
  - Include all personal fields (name, date_of_birth, gender, contact info)
  - Add validation for Person data
  - Purpose: Reusable component for creating/editing Person records
  - _Leverage: Existing form patterns, validation utilities_
  - _Requirements: 1.1, 2.2, 2.3_

- [ ] 24. Create FamilyTreeView component
  - File: frontend/src/components/profile/family-tree-view.tsx
  - Create visual representation of family relationships
  - Display marriages, spouses, children in tree format
  - Add navigation to edit family members
  - Purpose: Visual overview of family structure
  - _Leverage: UI components, visualization patterns_
  - _Requirements: 2.2, 2.3_

## Phase 4: API Integration and State Management

- [ ] 25. Create marriage API client functions
  - File: frontend/src/lib/api/marriages.ts
  - Create functions for marriage CRUD operations
  - Add functions for children association management
  - Add error handling and type safety
  - Purpose: Frontend API integration for marriages
  - _Leverage: Existing API client patterns from frontend/src/lib/api/_
  - _Requirements: 2.2, 2.3, 2.4_

- [ ] 26. Create person address API client functions
  - File: frontend/src/lib/api/addresses.ts
  - Create functions for PersonAddress CRUD operations
  - Add functions for address history queries
  - Add current address resolution
  - Purpose: Frontend API integration for address management
  - _Leverage: Existing API client patterns_
  - _Requirements: 1.2, 1.5_

- [ ] 27. Create useMarriages hook
  - File: frontend/src/hooks/use-marriages.ts
  - Create React hook for marriage state management
  - Add loading states, error handling, optimistic updates
  - Include family tree data fetching
  - Purpose: State management for marriage data
  - _Leverage: Existing hook patterns from frontend/src/hooks/_
  - _Requirements: 2.2, 2.4_

- [ ] 28. Create usePersonAddresses hook
  - File: frontend/src/hooks/use-person-addresses.ts
  - Create React hook for address history management
  - Add current address caching and updates
  - Include address validation
  - Purpose: State management for address data
  - _Leverage: Existing hook patterns_
  - _Requirements: 1.2, 1.5_

- [ ] 29. Integrate components into profile page
  - File: frontend/src/app/(site)/profile/_components/profile-form.tsx (modify)
  - Add new components to existing profile form layout
  - Create tabbed or sectioned layout for different profile areas
  - Add progress tracking for profile completion
  - Purpose: Complete profile management interface
  - _Leverage: Existing ProfileForm layout, Tab components_
  - _Requirements: All frontend requirements_

## Phase 5: Testing and Validation

- [ ] 30. Create backend model tests
  - File: backend/tests/test_marriages_models.py
  - Write unit tests for Marriage and MarriageChildren models
  - Test model relationships and constraints
  - Test marriage timeline validation
  - Purpose: Ensure model reliability and data integrity
  - _Leverage: Existing test patterns from backend/tests/_
  - _Requirements: 2.2, 2.3, 2.4_

- [ ] 31. Create backend API tests
  - File: backend/tests/test_marriages_api.py
  - Write integration tests for marriage API endpoints
  - Test CRUD operations and error scenarios
  - Test authentication and authorization
  - Purpose: Ensure API reliability and security
  - _Leverage: Existing API test patterns_
  - _Requirements: 2.2, 2.3, 2.4_

- [ ] 32. Create frontend component tests
  - File: frontend/src/components/profile/__tests__/
  - Write unit tests for all new profile components
  - Test form validation and user interactions
  - Test error handling and loading states
  - Purpose: Ensure component reliability
  - _Leverage: Existing component test patterns_
  - _Requirements: All frontend requirements_

- [ ] 33. Create end-to-end profile tests
  - File: frontend/e2e/profile-enhancement.spec.ts
  - Write E2E tests for complete profile setup workflow
  - Test family information entry and management
  - Test data persistence and retrieval
  - Purpose: Ensure complete user workflow functionality
  - _Leverage: Existing E2E test patterns_
  - _Requirements: All requirements_

## Phase 6: Documentation and Deployment

- [ ] 34. Update API documentation
  - File: Update FastAPI automatic documentation
  - Document all new endpoints and schemas
  - Add usage examples for marriage and address APIs
  - Purpose: Developer documentation for new APIs
  - _Leverage: FastAPI automatic OpenAPI generation_
  - _Requirements: All API requirements_

- [ ] 35. Create user documentation
  - File: frontend/src/app/(site)/profile/help/page.tsx (new)
  - Create help documentation for enhanced profile features
  - Add legal context explanations for family information
  - Purpose: User guidance for profile enhancement
  - _Leverage: Existing help page patterns_
  - _Requirements: All user-facing requirements_

- [ ] 36. Performance optimization and cleanup
  - Files: Various (optimization across components)
  - Optimize database queries with proper indexing
  - Implement caching for family tree data
  - Add lazy loading for large family datasets
  - Purpose: Ensure system performance with enhanced data
  - _Leverage: Existing performance patterns_
  - _Requirements: Performance requirements_