# Account deletion runbook

Status: operational procedure for the client-only account release
Owner: SQL Heist operator
Deadline: complete each verified request within 30 calendar days

The browser can authenticate the user and create an idempotent soft-lock through
`request_account_deletion(p_expected_user_id)`. It cannot delete `auth.users` without a privileged
credential, so permanent deletion remains an operator action. Never place a secret or
service-role credential in the app, this repository, a browser console, or the runbook.

## 1. Check the queue

Maintain a recurring business-day reminder and check the queue on every business day.
For each new request, also schedule a private reminder seven days before its deadline.
Run this read-only query in the Supabase SQL editor:

```sql
select
  id,
  username,
  delete_requested_at,
  delete_requested_at + interval '30 days' as deadline
from public.profiles
where delete_requested_at is not null
order by delete_requested_at;
```

Treat a request with seven or fewer days remaining as urgent. If the queue cannot be
checked or a deletion cannot be completed, record the incident immediately and resolve
it before the deadline rather than silently extending the promise.

## 2. Verify the soft lock

For the selected UUID, confirm that `delete_requested_at` is present and
`leaderboard_opt_in` is false. The live RLS gate separately verifies that a requested
account cannot write profile or progress changes and is absent from public views.

Do not ask the user to send a password, provider token, access token, or database
credential. The RPC already requires a recent password or OAuth authentication-method
reference before it records the request; the application additionally binds a
provider re-authentication return to the same Auth user and consumes it once. Consuming
that receipt only opens a fresh confirmation dialog: the user must retype the username
after the provider return and explicitly finish the request before the application calls
the RPC. The RPC also compares that initiating UUID with its current `auth.uid()` before
locking any row, so a cross-tab session change fails closed.

## 3. Permanently delete the Auth user

1. In Supabase Dashboard, open **Authentication → Users**.
2. Locate the exact Auth UUID from the queue; do not match on username alone.
3. Note the account email and whether a GitHub identity is linked only long enough to send the completion confirmation.
4. Delete that Auth user.

The foreign keys use `on delete cascade`, so deleting `auth.users` must remove the
matching `profiles`, `case_progress`, and `profile_consent_events` rows.

## 4. Verify completion

Run this read-only verification with the deleted UUID:

```sql
select
  exists (select 1 from auth.users where id = '<deleted-user-uuid>') as auth_exists,
  exists (select 1 from public.profiles where id = '<deleted-user-uuid>') as profile_exists,
  exists (
    select 1 from public.case_progress where user_id = '<deleted-user-uuid>'
  ) as progress_exists,
  exists (
    select 1 from public.profile_consent_events where user_id = '<deleted-user-uuid>'
  ) as consent_exists;
```

Completion requires all four values to be `false`. If any value is true, stop and
investigate; do not report completion.

Send a short confirmation to the account email after verification. Do not include the
UUID, progress, consent history, or any other account data in the message.

## 5. Keep minimal private evidence

Keep a private deletion ledger outside this repository, application, Supabase project,
and contact mailbox. Derive its subject reference as `HMAC-SHA-256(secret, Auth UUID)`
with a high-entropy secret held separately in the operator's password manager. A raw or
unkeyed UUID hash is not sufficient because UUID candidates can be matched. Never put
the HMAC secret in the ledger, browser, repository, database, shell history, or provider
support request.

The ledger may contain only the HMAC reference, request time, completion time,
deadline-met status, and confirmation time. It must not contain the email, username, raw
UUID, progress, or consent history. Restrict access to the operator, review it only for
deadline evidence, verified rights requests, or disaster-recovery re-deletion, and
delete each entry no later than 90 days after completion.

If a database backup is restored while a ledger entry remains, derive HMAC values for
the restored Auth UUIDs with the same secret, compare them with the private ledger, and
immediately repeat deletion and verification for matches before reopening account
traffic. If a verified data-rights request can be matched to a retained ledger entry,
handle that pseudonymous record manually under the applicable right and deadline.

## 6. Provider data

Deleting the Supabase Auth user cascades SQL Heist's stored Google/GitHub identity
metadata, but it does not delete the person's Google or GitHub account or directly erase
those providers' authentication/security logs. SQL Heist does not retain provider
access or refresh tokens. After each completed Google sign-in, the browser uses the
transient credential only to submit an immediate best-effort revocation request and
cannot read the cross-site response. GitHub authorization may remain because revoking an
OAuth-app grant requires confidential client credentials that cannot exist in this
static app. If GitHub was linked, the completion message must tell the person to revoke
SQL Heist separately under GitHub **Settings → Applications → Authorized OAuth Apps** if
they want to end that provider authorization. Provider-controlled residual records are
handled under the provider's retention cycle or data-subject-request process.

Database deletion also cannot directly erase Supabase/provider request or security logs
or rotated disaster-recovery copies. Handle those under the applicable provider's
documented retention cycle or rights-request process. Record current periods, contacts,
data roles, transfer bases, and safeguards before enabling each provider and keep that
record current.

The completion confirmation and any support/privacy correspondence are processed in the
published Microsoft Outlook.com/Hotmail contact mailbox. Delete a closed thread within
12 months unless a mandatory legal period or active claim requires longer retention,
then delete it when that period or claim ends. Microsoft states that a deleted item
generally remains in Outlook.com's Deleted Items folder for approximately seven days
unless emptied sooner, and then remains in its systems for up to 30 days after the
folder is emptied unless legally required longer. Account for that provider-controlled
residual period when answering a deletion or rights request. Confirm the mailbox
data-role, contract, international-transfer basis, and deletion controls as a current
production remediation item, not an account-launch-only task.
