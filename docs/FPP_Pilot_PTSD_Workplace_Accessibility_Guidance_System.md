# Full Product Prompt (FPP) — Pilot Version
## PTSD Workplace Accessibility Guidance System — Israel

## 1. Pilot Definition

### 1.1 What is being built
A pilot product that helps people with PTSD in Israel understand how to make their workplace more accessible, decide what to share, and optionally generate an employer-facing recommendation report. The product operates through a landing page and a WhatsApp-first conversation flow, supported by an internal reasoning engine, a longitudinal user profile, and an admin command center.

### 1.2 Who it is for
**Primary user:** people with PTSD who are employed, returning to work, searching for work, or facing work-related barriers.  
**Secondary user:** employer-side recipients such as direct managers, HR, or senior decision-makers.  
**Internal users:** system owner, admins, partner operators, and reviewers.

### 1.3 Main outputs
1. End-user report  
2. Employer-facing report  
3. Anonymous organizational signal report  
4. Lecture-opportunity lead object for export/API handoff

### 1.4 Main pilot channels
1. Landing page for trust/orientation/entry  
2. WhatsApp-first conversational flow  
3. Secure web report links  
4. Optional email for employer delivery

### 1.5 Pilot boundary
This pilot includes:
- landing page
- WhatsApp-first interview flow
- text + voice input, with limited image intake
- structured onboarding
- reasoning engine with visible logic map
- internal user profile / longitudinal memory
- admin command center
- human review workflow
- report generation
- lead creation and export/API handoff

This pilot does not include:
- legal advice
- diagnosis or treatment
- full CRM/sales pipeline
- employer self-service portal
- user dashboard beyond WhatsApp journey and report access
- support for all disability types
- fully autonomous employer delivery

---

## 2. Product Architecture

## 2.1 Core Design Principles

1. **Trust first**  
   The product must protect trust, privacy, consent, and clarity at every stage.

2. **Low overload**  
   The interaction must be structured, predictable, short-step, and non-overwhelming.

3. **Traceability**  
   Every important recommendation must be explainable and traceable back through the logic chain.

4. **Human approval in pilot**  
   Shareable outputs in the pilot must remain under human governance.

5. **WhatsApp-first experience**  
   The user experiences the product mainly through WhatsApp; internal complexity stays behind the scenes.

6. **Israeli context**  
   Reasoning, wording, and employer framing must fit Israeli workplace reality.

7. **Structured onboarding**  
   Every major process must start with orientation, expectations, boundaries, and control options.

---

## 2.2 System Map

### Entry Layer
- landing page
- invitation flow
- partner explanation
- trust and consent entry

### Conversation Layer
- WhatsApp-first interview
- structured onboarding
- text + voice + limited image intake
- pause/skip/resume flow
- distress-safe pacing

### Reasoning Layer
- normalization of user inputs
- barrier/trigger/context detection
- recommendation retrieval/filtering/scoring/selection/rendering
- visible logic map

### Memory Layer
- internal user profile
- interview history
- follow-up history
- change-event history
- consent and approval history
- recommendation history

### Admin Layer
- live case management
- recommendation workbench
- knowledge/rule management
- gap visibility
- analytics
- review/release control

### Output Layer
- user report
- employer report
- anonymous organizational signal
- lecture-opportunity lead object
- export/API handoff

---

## 2.3 Main Components

### A. Landing Page
Purpose: orientation, trust-building, partner visibility, consent framing, and entry into WhatsApp.

Required functions:
- explain what the service is
- explain who it is for
- explain what the user gets
- explain how the process works
- explain privacy/sharing boundaries
- explain possible human review
- identify partners
- provide WhatsApp CTA

### B. WhatsApp Interview Engine
Purpose: collect structured and unstructured information through a user-friendly messaging flow.

Required functions:
- text input
- voice-note input
- optional limited image input
- quick replies / buttons
- staged onboarding
- adaptive branching
- pause/skip/resume
- distress check-ins
- follow-up flows

### C. Reasoning and Recommendation Engine
Purpose: convert user inputs and knowledge-base logic into explainable case analysis and recommendations.

Required functions:
- normalize inputs
- classify barriers, triggers, workplace amplifiers
- interpret context
- retrieve candidate recommendation families/templates
- apply eligibility rules
- score and rank candidates
- deduplicate/diversify
- render audience-specific outputs
- assign confidence and review status
- support full traceability

### D. User Profile / Longitudinal Memory Layer
Purpose: maintain structured case memory over time.

Required contents:
- identity basics
- employment context
- disclosure preferences
- interview history
- barriers/triggers/patterns over time
- change events
- generated outputs and states
- admin review history
- recommendation history
- support/safety state
- knowledge-contribution status

### E. Admin Command Center
Purpose: operate the full product lifecycle.

Required domains:
- invitations and onboarding
- live case management
- reasoning visibility
- output review and release
- knowledge and rule management
- campaigns and follow-ups
- analytics and gap visibility
- audit and governance

### F. Lead Handoff Layer
Purpose: detect lecture opportunities and export them safely to external sales systems.

Required functions:
- detect lecture opportunity
- create structured lead object
- show reason for lead creation
- export or API handoff
- log what was handed off

---

## 2.4 User Journey

1. User reaches landing page  
2. User reads trust/process explanation  
3. User enters WhatsApp flow  
4. User goes through structured onboarding  
5. User completes adaptive interview  
6. System analyzes case  
7. Admin reviews when needed  
8. User receives personal output in WhatsApp + report link  
9. User decides whether to approve employer-facing output  
10. Employer output is reviewed and sent if approved  
11. Follow-up campaigns continue in WhatsApp  
12. User profile updates over time

### Human involvement disclosure rule
The system must clearly state:
- that human review may occur
- why it may occur: safety, quality, accuracy
- which output types are reviewed in the pilot
- that employer-facing outputs are not auto-sent without approval

---

## 2.5 Safety and Interaction Architecture

### Distress and interruption protocol
The interview must:
- start with lower-intensity questions
- go deeper gradually
- allow pause, skip, and resume at any point
- save progress
- support distress check-ins
- stop deeper probing when needed
- support human-review escalation when needed

### Structured onboarding rule
Every major flow must explain:
- what this process is
- why questions are being asked
- what the user gets
- what is optional
- what may be shared
- how to pause/stop
- whether human review may occur
- how long the stage will roughly take

---

## 3. Data and Knowledge Architecture

## 3.1 Source Role Model

The knowledge base is not a flat library. It is an interacting system.

### Source functions
1. **Diagnostic knowledge** — detects barriers  
2. **Interpretive knowledge** — explains what those barriers mean  
3. **Applied workplace knowledge** — shows how barriers appear in real work life  
4. **Implementation knowledge** — shows what employers can do  
5. **Communication knowledge** — shapes tone and framing

### Source-role summary from uploaded materials
- **Employment barriers questionnaire**: classification authority
- **Background to barriers questionnaire**: interpretation authority
- **Interview-derived spreadsheet**: applied pattern authority
- **Organizational procedures guide**: employer implementation authority
- **Presentations / visual materials**: communication authority

### Source-governance rule
- presentation materials do not overrule operational sources
- anecdotes do not overrule repeated patterns
- employer actions should not be generated without passing through lived-experience patterns

---

## 3.2 Knowledge Unit Types

Every important knowledge item should be normalized into one of these types:
1. barrier definition
2. signal / indicator
3. context modifier
4. trigger
5. workplace amplifier
6. workplace manifestation
7. recommendation family
8. recommendation template
9. implementation action
10. communication framing
11. boundary / caution
12. sales signal

---

## 3.3 Stable vs Situational Knowledge

### Stable knowledge
- recurring PTSD-related workplace barriers
- common trigger categories
- common accommodation families
- common employer mistakes
- safe communication principles

### Situational knowledge
- specific job
- workplace type
- stage of recovery/readiness
- disclosure boundary
- manager flexibility
- organization constraints
- current change events

### Rule
Recommendations must always combine:
**stable pattern + case-specific context + workplace-specific constraint**

---

## 3.4 Employment Journey Model

The product must reason by stage, not only by barrier.

Stages:
1. job search / candidate stage
2. recruitment / interview stage
3. onboarding / entry stage
4. active employment stage
5. change / instability stage
6. return-to-work / re-entry stage
7. retention-risk / breakdown stage

Same barrier, different stage = different recommendation.

---

## 3.5 Workplace-Type and Israeli Context Layer

Recommendations must account for:
- public sector / municipality
- private company
- NGO
- education
- customer-facing roles
- security-sensitive roles
- small business

The system must also adapt to Israeli realities:
- direct communication culture
- variable managerial discipline
- stigma and military/PTSD context
- Hebrew workplace language
- no American DEI tone
- no aggressive legalistic tone
- no clinical therapy tone

---

## 3.6 Gap Visibility Feature

The admin system must show where knowledge is strong or weak.

Gap types:
1. knowledge gap
2. logic gap
3. rule gap
4. workflow/interface gap

Coverage dimensions:
- barrier
- employment stage
- actor
- workplace type
- intervention type

The feature should show:
- weak zones
- high-output/low-evidence areas
- repeated admin corrections
- high-conflict areas
- what type of new source is needed

---

## 3.7 Knowledge Promotion Workflow

The system must not learn chaotically from cases.

States:
1. case-only insight
2. candidate pattern
3. validated reusable pattern
4. rule update candidate

Safeguards:
- de-identify before promotion
- log source case(s)
- log who promoted it
- define scope: global / campaign / segment-specific

---

## 4. Recommendation Architecture

## 4.1 Logic Map

The recommendation system must use a visible, auditable, editable logic map.

### Input Layer
- raw input
- question ID
- consent state
- job context
- input source

### Detection Layer
- signal detection
- barrier classification
- trigger classification
- workplace amplifier classification
- confidence level

### Interpretation Layer
- functional meaning
- severity/relevance
- context modifiers
- uncertainty flags
- contradiction flags

### Applied Pattern Layer
- matched workplace pattern
- matched lived-experience pattern
- matched solution family
- matched caution

### Output Layer
- user recommendation
- employer recommendation
- implementation priority
- time horizon
- review status

### Commercial Layer
- no business signal
- lecture opportunity detected
- lead created
- lead exported/API handed off

### Traceability rule
Every output item must be traceable:
**output → applied pattern → interpretation → detected signal → original input/source**

---

## 4.2 Recommendation Object Model

### Recommendation family
A broader intervention category.
Examples:
- predictability
- communication clarity
- sensory/environment adjustment
- meeting adaptation
- schedule flexibility
- manager behavior
- HR/process adaptation
- external resource referral

### Recommendation template
A reusable action unit inside a family.

### Rendered recommendation
Case-specific phrasing adapted to:
- user
- workplace
- audience
- disclosure level

---

## 4.3 Recommendation Identity and Tracking

Every recommendation template must have:
- stable recommendation ID
- version
- family
- barrier tags
- employment-stage tags
- workplace-type tags
- actor tags
- disclosure suitability
- confidence level
- lifecycle state

The system must track:
- retrieval frequency
- inclusion frequency
- edit frequency
- approval/share frequency
- usefulness signals
- stale/invalidated status
- associated lecture signals where relevant

---

## 4.4 Recommendation Selection Pipeline

The engine must work in this order:

1. **Case profiling**
   - employment stage
   - barrier set
   - trigger set
   - workplace amplifiers
   - disclosure level
   - workplace type
   - change-event status

2. **Candidate retrieval**
   - retrieve relevant families and templates from normalized knowledge

3. **Eligibility gating**
   A candidate is eligible only if it passes:
   - barrier fit
   - context fit
   - actor fit
   - disclosure fit
   - feasibility fit
   - safety/boundary fit
   - freshness/validity fit

4. **Scoring**
   Score eligible candidates by:
   - barrier relevance
   - context fit
   - feasibility
   - expected impact
   - disclosure compatibility
   - evidence strength
   - safety/trust fit
   - diversity contribution

5. **Deduplication and diversity**
   Avoid selecting multiple near-duplicates.
   The final top recommendations should cover complementary action angles.

6. **Packaging**
   Build audience-specific output packages.

7. **Review**
   Apply confidence thresholds and human review rules.

---

## 4.5 Recommendation Workbench (Admin)

Admin must be able to inspect and edit:
1. case profile
2. candidate retrieval
3. eligibility results
4. scoring by dimension
5. selection and dropped alternatives
6. rendering for each audience
7. review/edit history

The admin must be able to see:
**input → detection → retrieval → filtering → scoring → selection → rendering → release**

---

## 4.6 Confidence and Fallback

### Confidence levels
1. high
2. medium
3. low
4. escalate / human review required

### Fallback paths
1. ask clarifying follow-up questions
2. produce low-confidence option set
3. route to human review
4. give resource-first output instead of fake specificity

The system must never fake certainty.

---

## 4.7 Time Horizon Model

Recommendations must be tagged by:
- immediate
- near-term
- longer-term

The system should avoid overwhelming outputs and must separate quick wins from larger changes.

---

## 4.8 Recommendation Lifecycle

Lifecycle states:
1. draft/candidate
2. active
3. monitored
4. experimental
5. deprecated
6. archived

Lifecycle changes must be governed and logged.

---

## 4.9 Feedback Loop

The system must collect:
- delivery feedback
- usefulness feedback
- employer action feedback when available
- admin quality feedback

This feedback informs analytics, candidate review, and rule suggestions, but does not silently rewrite live rules.

---

## 5. Workflow and State Architecture

## 5.1 Output Types

### A. End-user report
Purpose: help the user understand their work-access needs and decide what to do/share.

Default structure:
1. what we understood about your situation
2. main workplace barriers affecting you now
3. what may be making them harder
4. top 3 recommendations for you
5. top 3 things an employer may need to know/do
6. suggested wording / conversation prep
7. useful resources / organizations
8. what was not shared without approval

### B. Employer-facing report
Purpose: give managers/HR practical, non-accusatory guidance.

Default structure:
1. purpose of this report
2. functional work-impact summary
3. key accessibility barriers in this work context
4. top 3 management/workplace adjustments
5. what communication helps
6. what to avoid
7. implementation priority
8. optional note that training/consultation may help

### C. Anonymous organizational signal
Purpose: send a non-identifying organization-level signal when user chooses no personal disclosure.

Default structure:
1. why the organization is receiving this
2. general indication of trauma-related workplace barriers
3. common employer-relevant patterns
4. practical organization-level actions
5. optional invitation for lecture/contact
6. explicit no-identifying-information statement

### D. Lead object
Purpose: hand off lecture opportunities externally.

Fields:
- organization name
- contact person if known
- contact channel
- source signal type
- reason lecture opportunity was detected
- organization type / sector
- recommended lecture angle
- safe context notes
- consent/sharing status
- export/API handoff status

---

## 5.2 Output Transformation Rule

The employer report must never be a lightly edited copy of the user report.

Transformation layers:
1. full internal case analysis
2. user-facing report
3. employer-facing report
4. anonymous organizational signal

Employer and anonymous outputs must be filtered by:
- disclosure level
- audience
- purpose
- trust/safety rules

---

## 5.3 Release and Delivery States

Each output must track:
1. draft generated
2. admin review required
3. admin edited/approved
4. user delivery ready
5. delivered to user
6. user viewed/opened, if trackable
7. user requested clarification/correction
8. user approved for employer sharing
9. employer delivery ready
10. sent to employer/organization
11. employer viewed/opened, if trackable
12. withheld/cancelled
13. archived/replaced

Outputs are structured report objects. Delivery channels are separate:
- WhatsApp summary
- secure link
- email
- admin/manual send

---

## 5.4 Human Review Rules in Pilot

### Must be human-approved before sending
- employer-facing reports
- anonymous organizational signal reports

### May be AI-drafted, with human review when flagged/required
- user-facing reports

### Human review should be disclosed
- on landing page
- in consent flow
- before output approval/sharing

---

## 5.5 Revision Model

After a user sees a report, the system must support:
1. clarification request
2. correction request
3. sharing-boundary change
4. new-information update
5. versioned reissue

Reports must never be silently overwritten.

---

## 5.6 Interruption and Dropout Model

Cases must distinguish:
1. intentional pause
2. silent drop-off
3. distress interruption
4. trust-related stop

Re-entry must begin with:
- where the process stopped
- what was saved
- what is next
- what remains optional

---

## 5.7 Follow-Up and Change-Event Model

Follow-ups must include:
- cadence-based check-ins
- event-based check-ins

Track change events such as:
- hired
- new role
- promotion
- new boss
- team change
- shift/schedule change
- move to hybrid/remote/on-site
- performance issue
- leave/return
- fired/resigned/job ended
- moved city
- moved abroad
- major commute change

### Revalidation levels
1. light refresh
2. partial revalidation
3. full reassessment

Recommendations become stale when:
- major work context changes
- disclosure changes
- manager changes
- workplace changes significantly
- user says they no longer fit
- too much time passes without revalidation

---

## 6. Admin and Governance Architecture

## 6.1 Admin Interaction Model

The pilot admin system should work like this:

### Main queues
- new users
- active cases
- cases needing review
- leads ready to export
- knowledge/rule review items

### One main case page
Most case work happens in one workspace:
- user info
- interview history
- logic map
- recommendation workbench
- reports
- approvals
- audit trail

### Inline edits
Most actions should happen inside the case:
- wording edits
- approval/rejection
- notes
- follow-up marks

### Separate system pages only for system-wide work
- rules
- knowledge base
- analytics
- permissions

---

## 6.2 Rule Architecture

Types of rules:
1. global rules
2. knowledge rules
3. logic rules
4. campaign rules
5. case-level edits

Admin must be able to edit:
- the rule
- its scope
- who changed it
- when
- why
- whether it affects future outputs only or a specific case

---

## 6.3 Admin Edit Governance

Types of edits:
1. light edit — wording/clarity
2. substantive edit — changes meaning/priority/recommendation
3. rule suggestion
4. case-only exception

Every edit must log:
- what changed
- who changed it
- why
- whether meaning changed
- whether it stays local or becomes reusable

---

## 6.4 Role and Permission Model

Roles:
1. system owner
2. admin operator
3. clinical/content partner
4. outreach/referral partner
5. employer-facing operator

Visibility must depend on:
- role
- partner organization
- case assignment
- consent scope
- action type

Partners should not automatically see everything.

Where possible, knowledge improvement should use de-identified cases/patterns.

---

## 6.5 External Handoff Rule

When exporting leads or using APIs, export only minimum necessary data.

### Default export-safe fields
- organization name
- contact person if known
- contact channel
- organization type
- lecture-opportunity reason in safe summary form
- recommended lecture angle
- lead ID
- consent/share status
- export timestamp/status

### Not exported by default
- full interview
- raw messages
- voice notes
- images
- full logic map
- sensitive personal details
- internal admin notes

All exports must log:
- what was sent
- to which system
- when
- by which trigger/operator
- under which consent basis

---

## 7. Product Copy (Hebrew)

Below is pilot-facing product copy direction. Keep it natural, Israeli, practical, non-clinical, and non-aggressive.

### 7.1 Landing page core message
```text
מרחב קצר, פרטי ומובנה שיעזור לך להבין איך מקום העבודה שלך יכול להיות נגיש יותר עבורך.

התהליך מיועד לאנשים שמתמודדים עם פוסט-טראומה ורוצים להבין טוב יותר מה מקשה עליהם בעבודה, מה יכול לעזור, ומה — אם בכלל — נכון לשתף עם המעסיק.

בסיום התהליך תקבל/י המלצות מעשיות עבורך, ואפשרות לאשר מסמך נפרד למעסיק — רק אם תבחר/י בכך.
```

### 7.2 Trust / consent message
```text
לפני שמתחילים, חשוב לדעת:
- אפשר לעצור, לדלג או לחזור אחר כך
- לא נשתף שום מידע בלי אישור שלך
- בחלק מהמקרים ייתכן שאיש צוות יעבור על התוכן כדי לשפר דיוק, בטיחות ואיכות
- המערכת לא מחליפה טיפול, אבחון או ייעוץ משפטי
```

### 7.3 WhatsApp onboarding message
```text
היי, אני כאן כדי לעזור לך להבין מה מקשה עליך בעבודה ומה יכול לעזור.

נלך שלב-שלב, בצורה קצרה וברורה.
אפשר לענות בטקסט, בהודעה קולית, ולפעמים גם לבחור תשובה מוכנה.
אפשר גם לעצור בכל רגע.

בסוף תקבל/י סיכום עם המלצות עבורך, ואפשרות להחליט אם ליצור גם מסמך למעסיק.
```

### 7.4 User report tone example
```text
מה שעלה מהשיחה הוא שיש כמה מצבים בעבודה שמקשים עליך במיוחד, בעיקר סביב חוסר ודאות, עומס, ואופן התקשורת.

המטרה של ההמלצות כאן היא לא "לתקן אותך", אלא לעזור לך להבין מה יכול להפוך את סביבת העבודה ליותר נגישה, ברורה ובטוחה עבורך.
```

### 7.5 Employer report tone example
```text
המסמך נועד לעזור להבין אילו התאמות ניהוליות וסביבתיות יכולות לשפר את היכולת של עובד/ת לתפקד בצורה יציבה וברורה יותר בעבודה.

הדגש כאן הוא תפקודי וניהולי: מה מקשה, מה יכול לעזור, ואילו צעדים פשוטים יחסית יכולים לשפר את המצב.
```

### 7.6 Anonymous organizational signal tone example
```text
המסמך הזה נשלח כדי לשקף כי ייתכן שקיימים בארגון חסמים תעסוקתיים שמשפיעים על עובדים המתמודדים עם אתגרים הקשורים לטראומה.

לא נכלל כאן מידע אישי מזהה. המטרה היא להציע צעדים כלליים שיכולים לשפר נגישות רגשית ותפקודית במקום העבודה.
```

---

## 8. LLM Operating Prompt

Use this as the operating prompt for the in-product model.

```text
You are the conversational intelligence layer inside an Israeli PTSD workplace accessibility pilot product.

Your role is to help users describe their workplace situation, identify barriers to accessible employment, and generate practical, traceable, audience-specific recommendations.

You do not provide diagnosis, treatment, legal advice, or guarantees about employer behavior.

SYSTEM PURPOSE
- Help a user understand what makes work harder for them
- Help the user decide what, if anything, to share
- Generate a user-facing recommendation output
- Generate an employer-facing output only under the correct disclosure and approval conditions
- Support an anonymous organizational signal mode when explicitly allowed
- Maintain a structured, explainable reasoning chain

CHANNEL AND INTERACTION MODEL
- The main user experience happens in WhatsApp first
- The conversation must feel structured, calm, short-step, and low-overload
- The user may respond in text or voice note
- Images may be accepted if relevant, but should not become central
- You should prefer clarity and pacing over conversational flourish

TONE RULES
For end users:
- calm
- validating
- practical
- empathetic
- on the user’s side
- non-clinical
- non-aggressive
- low-overload

For employer-facing language:
- professional
- concrete
- respectful
- management-oriented
- non-accusatory
- action-focused

GLOBAL PRODUCT RULES
- Never provide legal advice
- Never provide diagnosis or treatment
- Never replace therapist or clinician
- Never auto-send employer-facing material without the required approval/human workflow
- Never use aggressive, shaming, threatening, or overly clinical language
- Never overwhelm the user with too many recommendations
- Never treat PTSD knowledge as enough without workplace context
- Never produce fake certainty when evidence is weak

STRUCTURED ONBOARDING RULE
At the start of each major process, explain:
- what this stage is
- why the questions matter
- what the user will get
- what is optional
- what may or may not be shared
- whether human review may occur
- that the user can pause, skip, or stop

INTERVIEW LOGIC
Your interview logic should help collect:
- user functioning in work context
- job context
- workplace barriers
- triggers
- workplace amplifiers
- desired outcomes
- disclosure preferences
- consent/sharing boundaries
- communication readiness
- implementation feasibility
- change events over time

DISTRESS-SAFE BEHAVIOR
- Start with lower-intensity questions
- Move gradually
- Offer pause/skip/resume options
- If the user shows signs of overload or distress, reduce depth
- If the conversation appears too emotionally intense for deeper probing, stop escalation and shift to safer containment/orientation
- Prefer shorter follow-up questions over long explorations

REASONING MODEL
You must not reason from one source or one signal alone.
Internally, every recommendation should ideally connect:
- a user signal or detected barrier
- a context modifier
- an applied workplace pattern
- a feasible action

Use the following reasoning layers:
1. detect barriers
2. detect triggers
3. detect workplace amplifiers
4. interpret functional meaning
5. match workplace patterns
6. retrieve relevant recommendation families/templates
7. filter by disclosure, context, feasibility, and trust/safety rules
8. rank for relevance, feasibility, impact, and diversity
9. package only a small number of recommendations

RECOMMENDATION RULES
- Default to top 3 recommendations
- Prefer complementary actions, not duplicates
- Package recommendations by target actor
- Distinguish between:
  - user self-management/support action
  - user communication action
  - manager behavior action
  - HR/organizational action
  - external resource/specialist suggestion
- Tag recommendations internally by time horizon:
  - immediate
  - near-term
  - longer-term

DISCLOSURE RULES
Treat disclosure as a spectrum:
- no disclosure
- functional disclosure only
- partial contextual disclosure
- full voluntary disclosure

Never derive employer output directly from the full user analysis without applying the disclosure filter.

EMPLOYER OUTPUT RULES
Employer-facing outputs must:
- focus on function, management, environment, and implementation
- avoid unnecessary medical detail
- avoid blame
- avoid therapy language
- avoid legalistic threat framing

ANONYMOUS ORGANIZATIONAL SIGNAL RULE
When explicitly allowed, generate only:
- non-identifying organization-level observations
- practical accessibility steps
- optional invitation for lecture/further support
Never imply certainty about a specific identified employee.

LONGITUDINAL MEMORY RULE
When prior context exists, use it carefully.
Memory should improve relevance, not feel invasive.
Track:
- previous barriers
- previous recommendations
- previous disclosure preferences
- change events
- whether recommendations became stale or need revalidation

CHANGE-EVENT RULE
Important work/life transitions should trigger revalidation, including:
- new job
- promotion
- new manager
- shift change
- office move
- hybrid/remote change
- leave/return
- fired/resigned
- relocation

CONFIDENCE RULE
When confidence is weak:
- ask a targeted clarifying question
- or offer a small, conditional option set
- or route to human review
Do not present low-confidence conclusions as strong facts.

OUTPUT FORM
For user-facing output, keep structure clear and low-load.
For employer-facing output, keep structure short, practical, and management-readable.
For both:
- be specific
- be actionable
- be concise
- avoid long narrative explanation unless necessary for clarity

TRACEABILITY RULE
Your outputs must be explainable.
You should be able to support each major recommendation with:
- the barrier or difficulty it addresses
- the work context that makes it relevant
- the type of workplace pattern it reflects
- why this action was prioritized

BUSINESS SIGNAL RULE
Do not force commercial escalation.
Only flag lecture opportunity when the case indicates broader organizational need beyond a single accommodation issue.

LANGUAGE RULE
- Internal logic may be structured in English
- Product-facing copy should sound natural in Hebrew when presented to Israeli users/employers
- Avoid translation-sounding phrasing
```

---

## 9. Appendix — Implementation Notes for Coding LLMs

Keep this short. It is not the main architecture; it is a practical implementation aid.

## 9.1 Core System Objects
Build explicit objects for:
- user
- user profile
- interview session
- message/input
- normalized signal
- barrier
- trigger
- workplace amplifier
- change event
- recommendation family
- recommendation template
- rendered recommendation
- report object
- lead object
- approval object
- release state
- audit log
- rule object
- knowledge item
- knowledge source

## 9.2 Key State Machines
Implement visible state machines for:
- interview state
- output/release state
- recommendation lifecycle state
- lead handoff state
- review/approval state

## 9.3 Build Order
1. core data model  
2. landing page + WhatsApp entry abstraction  
3. interview/session handling  
4. admin queues + main case page  
5. logic map + recommendation workbench  
6. report objects + release states  
7. lead export/API handoff  
8. follow-up/change-event layer  
9. gap visibility + recommendation analytics

## 9.4 Pilot Technical Assumptions
- user side = landing page + WhatsApp + report links
- admin side = web app
- reports = structured web documents first
- exports = later rendering/email/PDF if needed
- database = internal source of truth
- integrations = light in pilot

## 9.5 Admin UI Assumption
- queues to find work
- one main case page to handle the case
- separate screens only for system-wide governance

## 9.6 Non-Negotiables in Code
- every recommendation has ID + version
- every important output is traceable
- every shareable output has explicit state transitions
- every admin edit is logged
- disclosure filtering is separate from case analysis
- employer-facing output is not a copy of the user report
- pilot human-review points are enforced in workflow logic
