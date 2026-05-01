# British Spelling Reference

This reference defines British English spellings to use in code, comments, documentation, and user-facing text.

## Function Names & Code

Use British spelling for project-owned identifiers.

### Correct (British)

```typescript
function serialiseData() {}
function normaliseInput() {}
function optimisePerformance() {}
function analyseResults() {}
function categoriseItems() {}
function centraliseConfig() {}
function initialiseComponent() {}
function recognisePattern() {}
function synchroniseState() {}
function realiseValue() {}
```

### Incorrect (American)

```typescript
function serializeData() {} // Use serialise
function normalizeInput() {} // Use normalise
function optimizePerformance() {} // Use optimise
function analyzeResults() {} // Use analyse
function categorizeItems() {} // Use categorise
function centralizeConfig() {} // Use centralise
function initializeComponent() {} // Use initialise
function recognizePattern() {} // Use recognise
function synchronizeState() {} // Use synchronise
function realizeValue() {} // Use realise
```

## Common Word Conversions

### -ise vs -ize

| British      | American     |
| ------------ | ------------ |
| analyse      | analyze      |
| categorise   | categorize   |
| centralise   | centralize   |
| finalise     | finalize     |
| initialise   | initialize   |
| modernise    | modernize    |
| normalise    | normalize    |
| optimise     | optimize     |
| organise     | organize     |
| prioritise   | prioritize   |
| recognise    | recognize    |
| serialise    | serialize    |
| stabilise    | stabilize    |
| synchronise  | synchronize  |
| utilise      | utilize      |
| visualise    | visualize    |

### -our vs -or

| British   | American |
| --------- | -------- |
| behaviour | behavior |
| colour    | color    |
| favour    | favor    |
| flavour   | flavor   |
| humour    | humor    |
| labour    | labor    |
| neighbour | neighbor |

### -re vs -er

| British | American |
| ------- | -------- |
| centre  | center   |
| fibre   | fiber    |
| litre   | liter    |
| metre   | meter    |
| theatre | theater  |

### Doubled consonants (-ll- vs -l-)

British English doubles the final L before a suffix when the vowel before it is unstressed. American English does not.

| British     | American   |
| ----------- | ---------- |
| cancelled   | canceled   |
| cancelling  | canceling  |
| counsellor  | counselor  |
| labelled    | labeled    |
| labelling   | labeling   |
| levelled    | leveled    |
| marvellous  | marvelous  |
| modelled    | modeled    |
| modelling   | modeling   |
| signalled   | signaled   |
| signalling  | signaling  |
| travelled   | traveled   |
| travelling  | traveling  |
| traveller   | traveler   |

### Single vs double l (fulfil vs fulfill)

| British    | American    |
| ---------- | ----------- |
| enrol      | enroll      |
| enrolment  | enrollment  |
| fulfil     | fulfill     |
| fulfilment | fulfillment |
| instil     | instill     |
| skilful    | skillful    |
| wilful     | willful     |

### -ence vs -ense

| British  | American |
| -------- | -------- |
| defence  | defense  |
| licence  | license  |
| offence  | offense  |
| pretence | pretense |

### -yse vs -yze

| British      | American     |
| ------------ | ------------ |
| analyse      | analyze      |
| breathalyse  | breathalyze  |
| catalyse     | catalyze     |
| paralyse     | paralyze     |

### ae/oe digraphs

British English preserves ae and oe from Latin/Greek origins. American English simplifies to e.

| British      | American    |
| ------------ | ----------- |
| aeon         | eon         |
| anaesthesia  | anesthesia  |
| archaeology  | archeology  |
| encyclopaedia | encyclopedia |
| gynaecology  | gynecology  |
| haemorrhage  | hemorrhage  |
| leukaemia    | leukemia    |
| manoeuvre    | maneuver    |
| oestrogen    | estrogen    |
| orthopaedic  | orthopedic  |
| paediatric   | pediatric   |

### Other common differences

| British    | American  |
| ---------- | --------- |
| ageing     | aging     |
| aluminium  | aluminum  |
| artefact   | artifact  |
| backwards  | backward  |
| catalogue  | catalog   |
| cheque     | check     |
| dialogue   | dialog    |
| draught    | draft     |
| grey       | gray      |
| judgement  | judgment  |
| kerb       | curb      |
| learnt     | learned   |
| manoeuvre  | maneuver  |
| mould      | mold      |
| plough     | plow      |
| programme  | program   |
| sceptical  | skeptical |
| storey     | story     |
| towards    | toward    |
| tyre       | tire      |
| whilst     | while     |

## Technical Terms

| British         | American        |
| --------------- | --------------- |
| deserialisation | deserialization |
| initialisation  | initialization  |
| optimisation    | optimization    |
| serialisation   | serialization   |
| serialiser      | serializer      |
| deserialiser    | deserializer    |

## Comments & Documentation

Correct:

- "This function optimises the serialisation process"
- "Initialise the colour configuration"
- "Analyse the behaviour patterns"

Incorrect:

- "This function optimizes the serialization process"
- "Initialize the color configuration"
- "Analyze the behavior patterns"

## Error Messages

Correct:

```typescript
throw new Error("Failed to serialise component data");
throw new Error("Cannot normalise configuration values");
throw new Error("Invalid colour specification provided");
```

## Licence / License

British usage distinguishes noun and verb:

- Noun: `licence`
- Verb: `license`

Do not use `licence` as a verb.

## External API / Third-Party Identifiers

Do not rewrite third-party names even when they use American spelling.

Allowed examples:

```ts
element.style.backgroundColor = "red";
JSON.stringify({ color: "#fff" });
fetch("/api/v1/user-preferences");
```

When wrapping external data for your own interface, prefer British forms.

## Quick Review List

Watch for these high-frequency replacements:

- serialize → serialise
- normalize → normalise
- optimize → optimise
- analyze → analyse
- color → colour
- behavior → behaviour
- center → centre
- initialize → initialise
- recognize → recognise
- synchronize → synchronise
- canceled → cancelled
- modeling → modelling
- traveled → travelled
- labeling → labelling
- fulfill → fulfil
- defense → defence
- gray → grey
- paralyze → paralyse
- pediatric → paediatric
- artifact → artefact
- maneuver → manoeuvre
- skeptical → sceptical

## Regex Review Aid

```bash
grep -RInE '\b(serializ|deserializ|optim|normaliz|analy|categoriz|centraliz|initializ|recogniz|synchroniz|utiliz|colou?r|behavio|cancele[^l]|modele[^l]|travele[^l]|labele[^l]|fulfill|enroll|defens|offens|gray|skeptic|pediatr[^i]|artifact|maneuver)\b' .
```

Note: verify matches manually to avoid false positives.
