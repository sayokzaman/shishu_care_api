# Database Schema Design

This document outlines the database structure for the health tracking system, including user roles, child health records, and administrative location hierarchies.

## 1. User Management

### User

The central authentication and identity table.
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | int | Primary Key |
| `phone` | string | Unique identifier/login |
| `full_name_bn` | string | Name in Bengali |
| `full_name_en` | string | Name in English |
| `password` | string | Hashed password |
| `role` | enum | `admin`, `parent`, `health-worker` |
| `createdAt` | date-time | |
| `updatedAt` | date-time | |

### Parent

Extended profile for users with the `parent` role.
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | int | Primary Key |
| `user_id` | int | Foreign Key $\rightarrow$ `User.id` |
| `is_pregnant` | bool | |
| `date_of_birth` | date-time | |
| `pregnancy_duration` | int | |
| `weight` | float | |
| `upazilla_id` | int | Foreign Key $\rightarrow$ `upazilla.id` |
| `district_id` | int | Foreign Key $\rightarrow$ `districts.id` |
| `division_id` | int | Foreign Key $\rightarrow$ `division.id` |
| `createdAt` | date-time | |
| `updatedAt` | date-time | |

### Health Worker

Extended profile for users with the `health-worker` role.
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | int | Primary Key |
| `user_id` | int | Foreign Key $\rightarrow$ `User.id` |
| `upazilla_id` | int | Foreign Key $\rightarrow$ `upazilla.id` |
| `district_id` | int | Foreign Key $\rightarrow$ `districts.id` |
| `division_id` | int | Foreign Key $\rightarrow$ `division.id` |
| `createdAt` | date-time | |
| `updatedAt` | date-time | |

---

## 2. Child & Health Tracking

### Child

Detailed records for children associated with a parent.
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | int | Primary Key |
| `parent_id` | int | Foreign Key $\rightarrow$ `Parent.id` |
| `full_name_bn` | string | |
| `full_name_en` | string | |
| `gender` | string | |
| `expected_delivery_date`| date-time | Optional |
| `date_of_birth` | date-time | Optional |
| `blood_group` | string | |
| `birth_location` | string | Optional |
| `mother_age_at_edd` | int | |
| `pregnancy_complications`| text | |
| `is_breastfed` | bool | |
| `birth_complications` | text | |
| `upazilla_id` | int | Foreign Key $\rightarrow$ `upazilla.id` |
| `district_id` | int | Foreign Key $\rightarrow$ `districts.id` |
| `division_id` | int | Foreign Key $\rightarrow$ `division.id` |
| `createdAt` | date-time | |
| `updatedAt` | date-time | |

### Growth Measurement

Periodic tracking of child physical growth.
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | int | Primary Key |
| `child_id` | int | Foreign Key $\rightarrow$ `Child.id` |
| `measured_by` | int | Foreign Key $\rightarrow$ `User.id` |
| `measured_at` | date-time | |
| `age_days` | int | |
| `weight_kg` | float | |
| `height_cm` | int | |
| `notes` | text | |
| `createdAt` | date-time | |
| `updatedAt` | date-time | |

### Illness Record

Log of diseases and treatments administered to the child.
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | int | Primary Key |
| `child_id` | int | Foreign Key $\rightarrow$ `Child.id` |
| `recorded_by` | int | Foreign Key $\rightarrow$ `User.id` |
| `recorded_at` | date-time | |
| `disease` | string | |
| `symptoms` | text | |
| `treatment_given` | text | |
| `doctor_name` | string | |
| `facility_name` | string | |
| `resolved` | bool | |
| `resolved_date` | date-time | |
| `notes` | text | |
| `createdAt` | date-time | |
| `updatedAt` | date-time | |

### Child Vaccinations

Schedule and history of vaccinations.
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | int | Primary Key |
| `child_id` | int | Foreign Key $\rightarrow$ `Child.id` |
| `vaccine_id` | int | Reference to vaccine type |
| `scheduled_date` | date-time | |
| `given_date` | date-time | |
| `facility_name` | string | |
| `is_given` | bool | |
| `createdAt` | date-time | |
| `updatedAt` | date-time | |

---

## 3. Administrative Locations

### Division

Top-level administrative region.
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | int | Primary Key |
| `name_bn` | string | |
| `name_en` | string | |
| `createdAt` | date-time | |
| `updatedAt` | date-time | |

### Districts

Secondary administrative region.
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | int | Primary Key |
| `division_id` | int | Foreign Key $\rightarrow$ `division.id` |
| `name_bn` | string | |
| `name_en` | string | |
| `createdAt` | date-time | |
| `updatedAt` | date-time | |

### Upazilla

Tertiary administrative region.
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | int | Primary Key |
| `district_id` | int | Foreign Key $\rightarrow$ `districts.id` |
| `name_bn` | string | |
| `name_en` | string | |
| `is_urban` | bool | |
| `createdAt` | date-time | |
| `updatedAt` | date-time | |
