Admin Dashboard

<https://dmdwebster-collab.github.io/payspyre-admin-demo/>

This needs a complete redesign, currently it is only acting as visual
representation of the database of transactions shared in the excel file
and not a fully functional finance platform. The excel file provided is
an external additional resource used to bridge short comings of the
current platform it is not a standalone depiction of what the back end
of the platform should look like. It is used to generate reports and
vendor statements, record and understand transactions. The previous
version of the admin dashboard was a much better representation of a
functional platform.

Currently there are no ways to interact with accounts it is just a list
of accounts and transactions, we can not make new accounts, approve

Work Places needed:

**[Originations Workplace]{.underline}**

This workplace is where all pending applications would be listed that
have not been submitted for credit underwriting. In this work place we
need to be able to create new loan applications, within those
applications there should be a static "Loan Header" that displays a
snapshot of the application details:

-   Profile Photo of applicant (Face shot)

-   Borrower Name

-   Application#

-   Province

-   Vendor Name

-   Provider/location Name

-   Credit Product

-   Requested Amount

-   Offer Amount

-   Loan Term

-   Interest Rate

-   Start Date (Contract start date)

Additional information area that will allow for accessing the following
information (open to different UI options here, currently discussed as
'tabs' but can be designed in a different way).

**Customer Details** -- This is intended to reflect the information
supplied during the credit application process. Eg. Personal
information, Residence / Address information (including map of address).
Identification information, Employment & Income Information. There
should be a button to edit the information that will unlock the fields
for revision (typically in a pop-up window).

**Co-Borrower** -- The ability to add / remove a co-borrower / view
saved co-borrower information (same details as the Customer Details tab)

**Bank Details** -- List of connected bank accounts via instant bank
verification through Flinks including: Bank Name, Account Number,
Transit Number, Institution number, Account Holder Name, Type of Account
and Source (Flinks, Manual). We need to be able to select a specific
account in the list to set it as the default payment source which all
transactions will be using. We also need to be able to add a manual bank
account All bank accounts regardless of how added needs to trigger a
payment profile creation via API with the payment processor Zum rails).
We will also need a way to remove / delete the bank accounts. For
security banking information apart from last few digits should be hidden
\*\*\*\* for everyone other then user that have been allocated the
permission to see it.

**Summary** -- This tab shows the contact information of the applicant
and co-applicant: Name, Email, Phone, Province and the loan details
listed above in the loan header. This would also have a section for
previous applications / loans including the application / Loan #,
amount, term, installment amount, installment frequency, open date,
close date, maximum days past due, Outstanding Balance and status.

**Initial Schedule** -- This is an initial amortization list showing all
payments in the current deal, including: installment #, Date of Payment,
Payment Amount, Principal Paid, Interest Paid, Fees Paid. This is also
where we could change the terms of the deal via a button "Adjust Terms"
This needs to bring up a pop-up window that allows us to change all the
aspects of the loan application:

Province Selection, Credit Product, Loan Amount, Term (in months),
Interest Rate, Payment Frequency, Vendor, Provider, Start Date, 1^st^
Payment Date and allow us to save the changes.

**Workflow** -- This is a record of the following information: Date /
Time, Previous status, new status, comments, User -- It is intended as a
record of the application flow any when it changed status and by who.

**Contacts** -- This tab is intended for 3 purposes:

1\. Record of all outgoing communications including date / time, User
that sent it, Subject / Purpose, Method (Phone, Email, SMS, Dashboard),
Result, Status (Successful, Failed), Comment and a copy of the
communication available for review. There should be filters for date /
time, Method, Status

2\. Send and log communications -- buttons to send emails that will
allow for selection of templates to be sent and selection of the method
to be sent (email, SMS, Dashboard). With a button to log manual contact
attempts.

3\. Ability to Set Flags and Borrower contact preferences including
enabling customer specific flags, Loan specific flags and adjust
borrower notification preferences (eg. Stop SMS, Set Preferred Contact
method, Is it okay to contact them at work?)

**Documents** -- The purpose of this tab is to display the prepared loan
agreement, Terms and Conditions, Privacy policy. Additionally, where we
would upload / save documents related to the loan for example demand
letter. There would also be a section that displays any documents that
the borrower / co-borrower has uploaded. Including ID (Front and Back),
Profile Photo, Additional documents (eg. Notice of Assessments or
Paystubs).

**Bank Statements** -- Shows the results of the Instant Bank
Verification completed

This should keep a record of all bank verifications completed and have a
button to request a new bank verification. This should be separated into
a summary page with all of our metrics calculated with the bank
verification, example: Income source identified, Income amount
identified, Minimum Balance within review period, Average Monthly Free
Cash Flow, Days with Negative Balance, Balance Trend, NSF Count, Stop
Payment Count, Micro Lender Name. Average monthly expenditure. Expenses
breakdown. Ability to Pay Calculation, Fraud Detection. Some of this
will be achieved by the transactions CPA Code (See codes below), some
will be AI identification. We should also have a way to filter and
adjust what broad transaction category is. Unfortunately, not every
business / sender uses the codes correctly which makes it impossible to
relay on them as the sole way to categorize transactions.

CPA Codes - EFT

The Canadian Payments Association (CPA) publishes these codes as well
the rules and regulations that have been established by the national
payment system. These rules and regulations are available on their web
site ([**payments.ca**](https://payments.ca/)).

  ------------------------------------------------------------------------
  **CPA      **Valid        **Description**
  CODE**     Payment        
             Types**        
  ---------- -------------- ----------------------------------------------
  200        Credit or      200 Payroll Deposit
             Debit          

  201        Credit or      201 Special Payroll
             Debit          

  202        Credit or      202 Vacation Payroll
             Debit          

  203        Credit or      203 Overtime Payroll
             Debit          

  204        Credit or      204 Advance Payroll
             Debit          

  205        Credit or      205 Commission Payroll
             Debit          

  206        Credit or      206 Bonus Payroll
             Debit          

  207        Credit or      207 Adjustment Payroll
             Debit          

  230        Credit or      230 Pension
             Debit          

  231        Credit or      231 Federal Pension
             Debit          

  232        Credit or      232 Provincial Pension
             Debit          

  233        Credit or      233 Private Pension
             Debit          

  240        Credit or      240 Annuity
             Debit          

  250        Credit or      250 Dividend
             Debit          

  251        Credit or      251 Common Dividend
             Debit          

  252        Credit or      252 Preferred Dividend
             Debit          

  260        Credit or      260 Investment
             Debit          

  261        Credit or      261 Mutual Funds
             Debit          

  265        Credit or      265 Spousal RSP Contribution
             Debit          

  266        Credit or      266 RESP Contribution
             Debit          

  271        Credit or      271 RSP Contribution
             Debit          

  272        Credit or      272 Retirement Income Fun
             Debit          

  273        Credit or      273 Tax Free Savings Account TFS/CLI
             Debit          

  274        Credit or      274 RDSP Contribution RDP/REI
             Debit          

  280        Credit or      280 Interest
             Debit          

  281        Credit or      281 Lottery Prize Payment
             Debit          

  300        Credit or      Restricted -- Government Use Only - 300
             Debit          Federal Government

  301        Credit or      Restricted -- Government Use Only - 301
             Debit          Agriculture Stabilization Payments

  302        Credit or      Restricted -- Government Use Only - 302
             Debit          Canadian Dairy Commission

  303        Credit or      Restricted -- Government Use Only - 303 HRDC -
             Debit          Training

  308        Credit or      Restricted -- Government Use Only - 308 Child
             Debit          Tax Credit

  309        Credit or      Restricted -- Government Use Only - 309 Goods
             Debit          and Services Tax

  310        Credit or      Restricted -- Government Use Only - 310 Canada
             Debit          Pension Plan

  311        Credit or      Restricted -- Government Use Only - 311 Old
             Debit          Age Security

  312        Credit or      Restricted -- Government Use Only - 312 War
             Debit          Veterans\' Allowances

  313        Credit or      Restricted -- Government Use Only - 313
             Debit          Canadian Pension Commission

  314        Credit or      Restricted -- Government Use Only - 314 Family
             Debit          Allowances

  315        Credit or      Restricted -- Government Use Only - 315 Public
             Debit          Service Superannuation

  316        Credit or      Restricted -- Government Use Only - 316
             Debit          Canadian Forces Superannuation

  317        Credit or      Restricted -- Government Use Only - 317 Tax
             Debit          Refunds

  318        Credit or      Restricted -- Government Use Only - 318
             Debit          Employment Insurance

  319        Debit          Restricted -- Government Use Only - 319 Dbt
                            CCRA Government of Canada

  320        Credit or      Restricted -- Government Use Only - 320
             Debit          Government Student Loans

  321        Credit or      Restricted -- Government Use Only - 321 CSB
             Debit          Interest

  322        Credit or      Restricted -- Government Use Only - 322
             Debit          External Affairs

  323        Credit or      Restricted -- Government Use Only - 323 Canada
             Debit          Savings Plan

  330        Credit or      330 Insurance
             Debit          

  331        Credit or      331 Life Insurance
             Debit          

  332        Credit or      332 Auto Insurance
             Debit          

  333        Credit or      333 Property Insurance
             Debit          

  334        Credit or      334 Casualty Insurance
             Debit          

  335        Credit or      335 Mortgage Insurance
             Debit          

  336        Credit or      336 Health/Dental Claim Insurance
             Debit          

  350        Credit or      350 Loans
             Debit          

  351        Credit or      351 Personal Loans
             Debit          

  352        Credit or      352 Dealer Plan Loans
             Debit          

  353        Credit or      353 Farm Improvement Loans
             Debit          

  354        Credit or      354 Home Improvement Loans
             Debit          

  355        Credit or      355 Term Loans
             Debit          

  356        Credit or      356 Insurance Loans
             Debit          

  370        Credit or      370 Mortgage
             Debit          

  371        Credit or      371 Residential Mortgage
             Debit          

  372        Credit or      372 Commercial Mortgage
             Debit          

  373        Credit or      373 Farm Mortgage
             Debit          

  380        Credit or      380 Taxes
             Debit          

  381        Credit or      381 Income Taxes
             Debit          

  382        Credit or      382 Sales Taxes
             Debit          

  383        Credit or      383 Corporate Taxes
             Debit          

  384        Credit or      384 School Taxes
             Debit          

  385        Credit or      385 Property Taxes
             Debit          

  386        Credit or      386 Water Taxes
             Debit          

  400        Credit or      400 Rent/Leases
             Debit          

  401        Credit or      401 Residential Rent/Leases
             Debit          

  402        Credit or      402 Commercial Rent/Leases
             Debit          

  403        Credit or      403 Equipment Rent/Leases
             Debit          

  404        Credit or      404 Automobile Rent/Leases
             Debit          

  405        Credit or      405 Appliance Rent/Leases
             Debit          

  420        Credit or      420 Cash Management
             Debit          

  430        Credit or      430 Bill Payment
             Debit          

  431        Credit or      431 Telephone Bill Payment
             Debit          

  432        Credit or      432 Gasoline Bill Payment
             Debit          

  433        Credit or      433 Hydro Bill Payment
             Debit          

  434        Credit or      434 Cable Bill Payment
             Debit          

  435        Credit or      435 Fuel Bill Payment
             Debit          

  436        Credit or      436 Utility Bill Payment
             Debit          

  437        Credit or      437 Internet Access Payment
             Debit          

  438        Credit or      438 Water Bill Payment
             Debit          

  439        Credit or      439 Auto Payment
             Debit          

  450        Credit or      450 Misc. Payments
             Debit          

  451        Credit or      451 Customer Cheques
             Debit          

  452        Credit or      452 Expense Payment
             Debit          

  460        Credit or      460 Accounts Payable
             Debit          

  470        Credit or      470 Fees/Dues
             Debit          

  480        Credit or      480 Donations
             Debit          

  600        Credit or      Restricted -- Government Use Only - 600
             Debit          Provincial Government

  601        Credit or      Restricted -- Government Use Only - 601 Family
             Debit          Support Plan

  602        Credit or      Restricted -- Government Use Only - 602
             Debit          Housing Allowance

  603        Credit or      Restricted -- Government Use Only - 603 Income
             Debit          Security Benefits

  604        Credit or      Restricted -- Government Use Only - 604
             Debit          Provincial Family Benefits

  605        Credit or      Restricted -- Government Use Only - 605
             Debit          Combined Fed-Prov/Terr Payment

  606        Credit or      Restricted -- Government Use Only - 606
             Debit          Workers\' Compensation Board

  607        Credit or      Restricted -- Government Use Only - 607
             Debit          Employment Assistance Allowance

  608        Credit or      Restricted -- Government Use Only - 608
             Debit          Automobile Insurance Plan

  609        Credit or      Restricted -- Government Use Only - 609
             Debit          Provincial Health Care Premium
  ------------------------------------------------------------------------

The summary page is also where you should be able to select the bank
verification report from the ones that have been completed to be able to
review current and past information.

There should be an Accounts page that allows you to access the full
transactional information for the selected account within that specific
bank verification report. This should include ways to sort, filter and
search the transactions should be displayed with the following columns:
#, Date & Time, Balance, Debit, Credit, Description, Category (Income,
Expense, Discretionary, non-discretionary etc..)

The transactions should show up below a header area that shows:

  -----------------------------------------------------------------------
  Title of Account                    Account Number
  ----------------------------------- -----------------------------------
  Category                            Transit Number

  Type                                Institution Number

  Currency                            Overdraft Limit

                                      Balance (Current)

                                      Balance (Available)

                                      Balance (Limit)
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------
  Account holder Name                 Email
  ----------------------------------- -----------------------------------
  Address                             Phone number

  -----------------------------------------------------------------------

Comments -- This tab is intended to be a way to record any notes that a
user wants to make regarding the loan.

This concludes the comments regarding the originations workplace.

**[Underwriting workplace]{.underline}**

Purpose of this work place is for the review of completed and submitted
applications for credit underwriting and completion of verifications,
with the ability to Pre-Approve, Approve, Reject, Cancel with applicable
reasoning selection / comment.

This workplace will have all of the information available in the
Originations tabs with the addition of the following tabs:

**Risk Score** - tab that summarizes the underwriting metrics and
identifies any rules or conditions that outside of the set guidelines
(if any) and makes a credit recommendation. Decision Summary, Risk
Ranking (Excellent, Good, Average, Weak, Poor), System recommendation w/
date and time, Underwriter decision w/ date and time (if manual review
needed). Creditworthiness / Risk Breakdown: Application check / scoring,
Anti-Fraud Check, Geolocation check, Cyber Security Check, Bank Account
Check / scoring, Credit Bureau Check / Scoring. Underwriting Rules
check. Flow should be the following: Application Check, Verifications
(see below), Anti-Fraud Check, Geolocation, Web Activity / Behaviour
Check, Cyber Security, Credit Bureau check / scoring, Bank Account check
/ scoring. After all this only the verified information used is
considered and the application is scored. There should be a way to
rescore an application if something has changed to repeat the process.
Additionally there should be a way to count or not count the credit
bureau / bank account scoring for either applicant.

**Verifications** -- this tab lists the standard KYC and financial
information required and how the system verified the information:
example: Borrower Name \<Name\> verified by \<Sources\>, Date and Time.
For a more in-depth look, The system would populate the information that
needs to be verified then would automatically complete that verification
with predetermined processes / acceptable sources. Borrower Name can be
found on: The borrower ID provided Borrower ID needs to be reviewed to
ensure it is real and valid (not expired), This is cross referenced with
the Name on the application to ensure the same individual and correct
spelling, this is further verified by the Bank verification to make sure
the name matches the account holder on the bank verification to be sure
the individual has the authority to authorize payments to be taken from
that account. This is matched against the other sources to confirm
consistent spelling and that the individual is who they say they are.
This is repeated for the following elements: Address, Phone number,
email, Employer, Income. The system would also need to flag where manual
review is required, any information that does not match and a way to
manually record the verification if completed by a user.

Both the credit underwriting and verification process we want to be
fully automated as much as possible.

**[Servicing Workplace]{.underline}**

The purpose of this work place is to Activate loan accounts that have
been approved, accepted and signed. As well as list all open and active
accounts. This work place should have all of the information available
in both the Originations and Underwriting workplaces with the addition
of the following tabs:

**Loan Header** -- Changed to include the following information:

-   Profile Photo of applicant (Face shot)

-   Borrower Name

-   Borrower Preferred Contact Method

-   Borrower Preferred Contact Details (eg. Phone#)

-   Loan \#

-   Province

-   Vendor Name

-   Provider/location Name

-   Credit Product

-   Loan Amount

-   Start Date (Contract start date)

-   Installment Payment

-   Installment Frequency

-   Next Installment Scheduled for

-   Outstanding Principal

-   Interest Due

-   Fees Due

-   Next Installment Due

-   Past Due Amount

-   Total Amount Due

-   Account Due As of Date (to determine days past due)

-   Current Days Past Due

-   Amount to Move

-   Add-on Fee balance

**Summary** - Tab expanded to include performance information

-   Contact details

    -   Name, Email, Phone, Province

-   Loan Details

    -   Loan ID

    -   Application Date

    -   Amount

    -   Term

    -   Rate

    -   Contract Date

    -   Interest start date

    -   Next payment date

    -   Installment amount

    -   Installment frequency

    -   System Decision (underwriting)

    -   Credit Risk (Risk ranking)

    -   APR

-   Loan performance

    -   Total Repayment to date

    -   Principal Paid

    -   Interest Paid

    -   Fees Paid

    -   Add-on Fees Paid

    -   Installments owed

    -   Installments paid

    -   Installments due

    -   Maximum Days Past Due

    -   \# of Late Payments

    -   \# of NSF Payments

    -   \# of Deferments

    -   \# of Adjustment of Terms

-   Other Loans

    -   \# of Other Active Loans

    -   Outstanding Balance of Other Loans

    -   \# of Previous Loans

    -   Maximum Days Past Due of Other Loans

    -   \# of Late Payments of Other Loans

    -   \# of Deferments of Other Loans

**Initial Schedule** -- Tab expanded to include:

Ability to change the repayment schedule frequency, Ability to change
the due date, generate the required legal documentation required to so,
including new amortization schedule and send to borrower dashboard for
review, acceptance and signature. Displays a list of all payments as
before and with a status scheduled, paid, outstanding, deferred

**Renewal** -- The purpose of this tab is to provide a way to renew the
current loan into a new one, adding additional funds which would trigger
a new application, underwriting and contract (full new originations
cycle) but would include the payout for the current account in the
calculations and would be automatically closed once the new account is
activated. This would need all the functionality to achieve this.

**Transactions** -- This tab is a record of actual processed
transactions and how they were applied to the account. Think of this as
the account ledger. We should be able to download a statement of these
transactions. Transaction details as follows:

Date, Reference#, Transaction (eg. Disbursement, Automatic charge),
Amount, Method, Operator (User), Comments / Error. You can expand each
transaction to show greater detail: Creation Date, Effective Date,
Repayment Method, Service, Repayment Mode, Principal, Interest, Fees.\
\
We will need to be able to remove (remove does not mean delete, it means
remove the transaction from the account of the loan account.) the
transactions manually IF required. All transactions need to be visible
for transparency and ensure accountability / accuracy.

**Scheduled Transactions** -- This tab has 2 primary functions:

1\. Ability to create new custom transactions & retain a list of them
including: #, Status, Effective Date, Amount, User, comments

2\. Ability to suspend upcoming scheduled transactions & retain a list
of suspensions including: #, Status, Start Date, End Date, User,
Comments

We should also be able to edit / delete the above if it has not yet
occurred but locked if it has.

**Hardship** -- This tab is intended for back end users to access and
initiate hardship measures like Deferments, Adjustment of Terms,
Refinance Balance Only. Including completing any documentation that
needs to be sent to the borrower and review / accepted / signed. This
would also be a record of previous hardship measures taken. Measures
need to be qualified for and specific information obtained form
borrowers to ensure responsible use of the measures. This is something
that would require additional user permissions to access.

**[Collections Workplace]{.underline}**

The purpose of the collections work place is to focus collection efforts
on accounts that are current past due. And will contain all the
information in the preceding workplaces with the addition of:

**Action Plan** -- Ability to communicate to the system or user specific
next steps to take in the collection of the account.

**Contacts** -- Expand functionality to include a new type of contact
"Promise to Pay" which will record borrowers promises to make payments
including all the normal contact recording in addition to Date of
Payment, Amount of Payment and method of Payment.

Reports Workplace

This is an overview of the performance of the company's portfolio and
can drill down to vendor / provider levels.

**Business performance summary** - Geographical report (heat map of
active loan locations), Portfolio report including Portfolio size,
Disbursement Amount, Repaid Amount, Profit, Profit / Portfolio.

Risk report, \$ Paid on time, \# paid on time, \$ Paid Late, \# Paid
Late, At Risk, Losses

Collection Report -- Arrears \$ & #, Write-0ffs, Current Month Late (DPD
= 1 to 29), Potential 30 (DPD = 30 to 59), Potential 60 (DPD 60 to 89),
Potential 90+ (DPD 90+)

Performance report (Number / Amount of Applications)

Losses report -- Top write-off reasons \# , \$

Time series report (drop down list of above individual options with
definable timeframe

**Portfolio Details**

-   Portfolio #/\$ over time

-   Active Loans vs Portfolio

-   Overall repayment amount per interval (total repaid, Principal,
    Interest, Fees)

-   Number of loans grouped by Vendor / Provider

-   Number of loans grouped by loan amount

-   Number of loans grouped by Risk ranking

-   Repaid vs. Disbursed

-   Approved vs. rejected

Operational

-   Business Status

    -   New

        -   Loans, Approved, Rejected, Amount Disbursed

        -   Returning Clients, Approved, Rejected, Amount disbursed

    -   Active

        -   Performing loans

            -   \#

            -   Amount

            -   Paid

            -   Earned

            -   Average Interest

        -   Non performing loans

            -   \#

            -   Amount Past Due

            -   Outstanding Interest and Fees

            -   Outstanding Principal

            -   Average Days Past Due

    -   Closed

        -   Paid in full on time

            -   \#

            -   Amount

            -   Earned Average Interest

            -   Early Payments

        -   Paid in full with Delays

            -   \#

            -   Amount

            -   Earned Average Interest

            -   Earned Fees

        -   Written off:

            -   \#

            -   Amount

            -   Principal Written off

            -   Interest Written off

            -   Fees Written off

Origination efficiency

**Risks** -- Risk and loss reporting / graphs, delinquency performance

**[Archive Workplace]{.underline}**

This is where all rejected applications / closed accounts are stored /
listed. With all the information available from the servicing workplace
without the functionality needed for active loans. Loan header new
displays the method of closure (rejected, cancelled, repaid, written
off, refinanced etc..) these are also displayed as an icon beside the
account in the list.

**[Settings Workplace]{.underline}**

This is where we are going to configure the variable parts of the
platform

**Accounts** -- create, edit, remove back end users and set permissions
for each user

**Company Settings** --

-   Branding

    -   company name, legal name, Brand Name, Company Address, Company
        City, Company Province, Company Country, Company Phone, Company
        Website, Company email, Lending Type, Foundation date, Logo
        files, Favicon

-   Province Settings

    -   Ability to set provinces in which we operate / do business

    -   Ability to set specific Province guidelines / rules eg. APR
        limit, NSF charge etc.. (use province regulations and consumer
        protection acts to determine what needs to be recorded here).
        Essentially requirements to compliantly operate within that
        province that are hardcoded into the system to ensure no
        regulations are broken

**Integrations** -- API Integration setup (system required information
to use API for the needed services)

-   Email Notifications

    -   Service

    -   From Address

    -   From Name

    -   Login

    -   Password

    -   Enable SSL

    -   Host

    -   Port

-   SMS Notifications

    -   Service

    -   Service Login

    -   Service Password

    -   Sender

-   Document Signing

    -   Service

    -   Client ID

    -   Client Secret

    -   Account username

    -   Account password

    -   URL

    -   Check box Enable embedded signing from borrower dashboards

-   Bank Account Verification

    -   Service

    -   When to Complete bank verification selection

    -   Verification request expiry (days)

    -   Verification reminder (days)

    -   Check box Allow Borrower to skip request

    -   Customer ID

    -   Service URL

    -   iFrame URL

    -   Currency

    -   Depth of report selection (90 days, 365 days)

    -   Test mode

    -   Check box Use Attributes

    -   Check box Log Response

-   Credit Bureau

    -   Service

    -   Check box Automatic Request

    -   Member Number

    -   Security Code

    -   Customer Code

    -   Environment

    -   Check box Log request

    -   Check box Log Response

    -   Client ID

    -   Client Secret

-   Payment Processing

    -   Checkbox Use the same service for all operations (disbursements
        / payments)

    -   Service

    -   API Username

    -   API Password

    -   Wallet ID Payable

    -   Wallet ID Receivable

    -   Check Box Use webhooks

    -   Webhook Secret

-   Analytics

    -   Service

    -   Analytics measurement ID

-   ID Verification

    -   Need to build the requirements for integration with an ID
        verification provider. Or have one build in house.

**Loan Settings**

-   **Credit Products** - Ability to create credit products with various
    terms -- this is a credit product builder and will need all the
    functionality to build the credit product and have it linked to the
    correct documentation and vendor

-   **Delinquency Buckets** -- Ability to set pay due periods (buckets)
    and set at one point the account is considered in default

**Decision Engine**

-   Decision rules -- all configurable underwriting rules with selected
    outcomes if check fails (Manual review, Auto Reject, No Action)

    -   Categories: Application checks, Fraud prevention, Geolocation,
        Network Security, Web Activity / behaviour rules, Bank
        Verification rules, Credit Bureau checks

-   Scorecards -- Ability to create customized credit score cards and
    assign them to different vendors. Applications for that vendor will
    be scored according to the assigned scorecard. There will be a
    default scorecard that is used with custom once available for
    creation and use.

**Notifications**

-   General system notifications (ability to set customized
    notifications for each stage / triggers in the system using)

-   
