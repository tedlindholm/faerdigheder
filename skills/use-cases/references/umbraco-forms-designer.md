# Umbraco Forms designer (Forms 17)

Notes for use cases and Playwright tests about conditions in Umbraco Forms' own designer. Checked against Umbraco 17.8 and Forms 17.7; the markup is Forms' and may change between releases.

## Where things are

- The designer: `/umbraco/section/forms/workspace/forms-form/edit/<form id>`. It draws slowly on first load; allow about 30 seconds.
- A page is `forms-form-page`; a group is `forms-form-fieldset`.
- A rule summary is `forms-form-condition-summary`, worded as Forms writes it: "Show this group if all of the following match: bookingData is hasHotel:true". Pages say "Hide buttons for this page if …".
- `hasText` can read a summary but not a question's caption inside a group, so find a group by its rule rather than its question.
- Settings buttons: `uui-button[label="Edit Group"]`, `uui-button[label="Edit Page"]`. The panel opens as the last `uui-modal-sidebar`.

## The condition row in the panel

**Conditions** has an On toggle, then: **Show**/**Hide** · this group if **all**/**any** of the following match:, then one row per rule: the field · the comparison · a text box (or a dropdown when the field has options) · delete.

Reading it in a test: the panel's comboboxes' `option:checked` give, in order, Page, Show/Hide, all/any, the field and the comparison; the rule text is the panel's textbox value.

```ts
const panel = page.locator("uui-modal-sidebar").last();
await expect(panel.getByRole("combobox").locator("option:checked")).toHaveText([
  "Your trip", "Show", "all", "bookingData", "is",
]);
await expect(panel.getByRole("textbox")).toHaveValue("hasHotel:true");
```

## Messages

Forms 17.7 does not show the reason when it refuses a save; a package must show it itself (for example through the backoffice's `uui-toast-notification`). Test for the message exactly once, so the test fails if a later Forms release starts showing it too.
