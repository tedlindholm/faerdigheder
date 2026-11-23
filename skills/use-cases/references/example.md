# A finished use case

What a use case looks like when it is ready for `Docs/use-cases/`, with its tagged tests. The shop, the code and the API are invented. It has no screen of its own (GUI *No*), so a **Rule** section takes the place of a sketch. Notes on why it is written this way follow.

## The use case

`Docs/use-cases/UC-007-discount-code-matches-exact-text.md`:

````markdown
# UC-007: A discount code matches only its exact text, capital letters included

| | |
| --- | --- |
| **Area** | Checkout |
| **GUI** | No |

## Given

The shop has one discount code, `SUMMER10`, worth 10% off. A basket holds £40.00 of goods and no discount. The front end sends one of these:

```json
{ "code": "SUMMER10" }
```

```json
{ "code": "summer10" }
```

## When

The front end applies the code to the basket: `POST /api/basket/discount`.

## Then

`SUMMER10` matches: the response is `200` and the basket's `discount` is `4.00`. `summer10` does not match: the response is `422` with `"error": "code-not-recognised"`, and the basket's `discount` stays `0.00`. Part of the code is not a match either: `SUMMER` and `SUMMER100` are refused the same way.

## Rule

A code matches when the text sent is the code, letter for letter, capital letters included.

| Sent | Matches |
| --- | --- |
| `SUMMER10` | Yes |
| `summer10` | No |
| `Summer10` | No |
| `SUMMER` | No |
| `SUMMER100` | No |

## Related

- [UC-006](UC-006-expired-discount-code-is-refused.md): a code past its end date is refused, even when the text matches.
- [UC-008](UC-008-spaces-around-discount-code-are-ignored.md): spaces before and after the code are ignored.

## Tests

- [tests/api/discount-codes.test.ts](../../tests/api/discount-codes.test.ts): `SUMMER10` and `summer10` against the running API.
- [tests/dotnet/DiscountCodeTests.cs](../../tests/dotnet/DiscountCodeTests.cs): every row of the rule's table, in the comparison itself.
````

## The tests that name it

In `tests/api/discount-codes.test.ts`, the ID starts the title:

```ts
test("UC-007: SUMMER10 is applied and summer10 is refused", async () => {
  // …
});
```

In `tests/dotnet/DiscountCodeTests.cs`, the trait carries the ID and each table row is a case:

```csharp
[Theory]
[Trait("UseCase", "UC-007")]
[InlineData("SUMMER10", true)]
[InlineData("summer10", false)]
[InlineData("Summer10", false)]
[InlineData("SUMMER", false)]
[InlineData("SUMMER100", false)]
public void A_code_matches_only_its_exact_text(string sent, bool matches) { /* … */ }
```

## Why it is written this way

- **The title is the outcome.** One sentence, no "handles" or "supports". A reader who only scans the index knows the rule.
- **Given shows the input as it arrives.** Both variants, as the JSON the front end sends, and nothing that does not affect the outcome.
- **When is one action**, named the way the system receives it.
- **Then is observable and exact.** It names the status codes, fields and error text a test asserts on, and says what does not change: the discount stays `0.00`.
- **Near misses close the obvious misreading.** `SUMMER` and `SUMMER100` show that matching is not by prefix or containment.
- **Neighbouring rules are separate cases.** Expiry and surrounding spaces give different outcomes from the same input field, so they are their own use cases, linked under **Related** rather than folded in.
- **Each test file says what it proves.** One end-to-end test covers the two inputs in Then. One unit test covers every row of the table. Both carry the ID and both are listed.

A GUI *Yes* case has the same sections, with **Sketch** in place of **Rule**: the SVG wireframe beside the file, embedded with `![What the screen shows](UC-007-….svg)`.
