# BalanceCard Implementation

This document provides details on the BalanceCard component implementation that fetches and displays balance data from the Supabase database.

## Overview

The BalanceCard component now retrieves real data from the database via a new API endpoint:
- `app/api/iqr/business/balance/route.ts` - API endpoint that fetches balance data for a business
- `components/iqr/dashboard/balancecard.tsx` - Updated component to fetch and display real data
- `app/api/iqr/business/balance/debug/route.ts` - Debug endpoint to inspect database records

## Key Features

1. **Real-time Data**: Displays current balance, last subscription date, and message count from the database
2. **Smart User Detection**: Uses a fallback mechanism to find a valid user if the provided user_id doesn't exist
3. **Foreign Key Compliance**: Ensures all database operations respect the foreign key constraints
4. **Detailed Logging**: Provides extensive console logging in development environment
5. **Refresh Functionality**: Allows manual refresh of the balance data

## Database Structure

The implementation works with two tables in Supabase:

1. `user_balance` table - Contains balance information:
   - `id`: Primary key (UUID)
   - `business_id`: Foreign key to businesses table (NOT NULL)
   - `user_id`: Foreign key to iqr_users table (NOT NULL)
   - `balance`: Numeric value representing the account balance (NOT NULL, default: 0)
   - `total_messages`: Integer count of messages (NOT NULL, default: 0)
   - `last_subscription_date`: Timestamp of the last subscription payment
   - `message_cost`: Numeric value for message cost (NOT NULL, default: 0.01)
   - `created_at`: Timestamp when the record was created
   - `updated_at`: Timestamp when the record was last updated

2. `messages` table - Used to count total messages for statistics:
   - `business_id`: Foreign key to the businesses table

## Foreign Key Constraint Handling

The API now handles the foreign key constraint between `user_balance.user_id` and `iqr_users.id` by:

1. Checking if the provided user_id exists in the iqr_users table
2. If not found, falling back to the business owner's user_id
3. If no business owner found, using any valid user associated with the business
4. Only attempting to create a record with a validated user_id that exists in iqr_users

This ensures we never violate the foreign key constraint while still providing balance data.

## Auto-Creation Feature

If a user_balance record does not exist for the given business_id and validated user_id:

1. The API endpoint automatically creates a new record with:
   - `business_id`: The provided business ID
   - `user_id`: A validated user ID that exists in the iqr_users table
   - `balance`: Initial value of 0
   - `total_messages`: Initial value of 0
   - `last_subscription_date`: null (displayed as "No subscription")
   - `message_cost`: Initial value of 0.01

This ensures that every user will see at least a default balance card, even if they're new to the system.

## How to Test

1. **Manual Testing in Browser:**
   - Navigate to the IQR Dashboard in your browser
   - Check the BalanceCard component in the top right
   - It should display:
     - Current balance with dollar sign and two decimal places
     - Last subscription date in YYYY-MM-DD format
     - Total message count with proper formatting
   - Test the refresh button to see if it updates the data

2. **Using the Developer Console:**
   - Open your browser's developer tools
   - Check the Network tab
   - Look for a request to `/api/iqr/business/balance?businessId=X&userId=Y`
   - Verify that the response includes `creditValue`, `lastSubscriptionDate`, and `totalMessages`

3. **Testing with No Data:**
   - If there's no balance record for a user/business, it should:
     - Find or create a new record in the database with default values
     - Display $0.00 as the balance
     - Display "No subscription" for the last subscription date
     - Display 0 for total messages (or the actual count if messages exist)

4. **Using the Debug Endpoint:**
   - Access `/api/iqr/business/balance/debug?businessId=X&userId=Y` in your browser (when logged in)
   - This will show user_balance records, table structure, and user validation details
   - Add `?raw=true` parameter to see full raw data
   - The simulation section shows what the main API would do with the same parameters

## Troubleshooting

- If the balance doesn't display properly, check the browser console for logs with the prefix `[BalanceCard]`
- Look for API errors in the Network tab of developer tools
- Use the debug endpoint `/api/iqr/business/balance/debug` to inspect the database contents
- Verify that the business_id and userId values being passed to the component are correct
- Check that the component's React state is updating properly after fetch requests

## Common Issues

1. **Foreign Key Constraint Errors**: 
   - These should now be handled automatically by the API
   - The API will find a valid user_id if the provided one doesn't exist

2. **No Data Displayed**: 
   - Check if the businessId prop is being passed correctly to the BalanceCard
   - Verify the console logs to ensure the API call is being made
   - Check network request status in developer tools

3. **Error Messages**:
   - Look for console errors or toast notifications indicating API issues
   - Check the API response in developer tools for specific error messages

4. **Database Connection Issues**:
   - Ensure all the necessary environment variables are set for database access
   - Verify that the user has necessary permissions to read/write to user_balance table 