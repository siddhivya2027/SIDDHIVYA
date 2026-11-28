import { test } from "node:test";
import assert from "node:assert/strict";
import { checklistMessage, checklistStatus, doneCount, isFoodBusiness, sameNumber, SELLER_CHECKLIST, validGstin, validPan } from "@/lib/launch/onboarding";
import { setup } from "./fixtures";

const AGENCY = ["+91 90636 16726"];
const full = () => setup({ addressProof: true, ownContactConfirmed: true, teamAccess: true, photosReady: true });

test("C01 checklist has 8 items with unique ids, same list for website and software", () => {
  assert.equal(SELLER_CHECKLIST.length, 8);
  assert.equal(new Set(SELLER_CHECKLIST.map((c) => c.id)).size, 8);
});

test("C02 a fully ready seller scores 8/8", () => {
  const st = checklistStatus(full(), { email: "lakshmi@example.com", agencyPhones: AGENCY });
  assert.equal(doneCount(st), 8, JSON.stringify(st.filter((x) => !x.done)));
});

test("C03 the agency's own number is refused as the seller's number", () => {
  const st = checklistStatus(full(), { email: "x@y.com", agencyPhones: AGENCY });
  assert.equal(st.find((x) => x.id === "own_contact")!.done, true);
  const bad = checklistStatus({ ...full(), phone: "919063616726" }, { email: "x@y.com", agencyPhones: AGENCY });
  const oc = bad.find((x) => x.id === "own_contact")!;
  assert.equal(oc.done, false); assert.match(oc.warn ?? "", /agency/);
  assert.ok(sameNumber("+91 90636 16726", "09063616726"));
  assert.ok(!sameNumber("+91 90636 16726", "919876543210"));
});

test("C04 own contact needs phone, email AND the confirmation tick", () => {
  assert.equal(checklistStatus({ ...full(), ownContactConfirmed: false }, { email: "x@y.com" }).find((x) => x.id === "own_contact")!.done, false);
  assert.equal(checklistStatus(full(), {}).find((x) => x.id === "own_contact")!.done, false, "no email");
});

test("C05 GST: valid GSTIN, or Enrolment ID with a warning that Amazon/Flipkart still need GSTIN", () => {
  assert.ok(validGstin("37ABCDE1234F1Z5")); assert.ok(!validGstin("37ABCDE1234F1Y5")); assert.ok(!validGstin("123"));
  const enr = checklistStatus(setup({ gstin: "", enrolmentId: "ABC123DEF456GHI" }), {}).find((x) => x.id === "gst")!;
  assert.equal(enr.done, true); assert.match(enr.warn ?? "", /GSTIN/);
  assert.equal(checklistStatus(setup({ gstin: "WRONG" }), {}).find((x) => x.id === "gst")!.done, false);
});

test("C06 PAN format and FSSAI (14 digits, not expired; skipped for non-food)", () => {
  assert.ok(validPan("ABCDE1234F")); assert.ok(!validPan("ABCD1234F"));
  assert.equal(checklistStatus(setup({ fssaiExpiry: "2020-01-01" }), {}).find((x) => x.id === "fssai")!.done, false);
  assert.equal(checklistStatus(setup({ fssaiNumber: "" }), { isFood: false }).find((x) => x.id === "fssai")!.done, true);
  assert.equal(isFoodBusiness("Indian sweets"), true); assert.equal(isFoodBusiness("Silk sarees"), false); assert.equal(isFoodBusiness(""), true);
});

test("C07 photos count from products, or the manual tick", () => {
  const s = { ...full(), photosReady: false };
  assert.equal(checklistStatus(s, { maxPhotos: 2 }).find((x) => x.id === "photos")!.done, false);
  assert.equal(checklistStatus(s, { maxPhotos: 3 }).find((x) => x.id === "photos")!.done, true);
});

test("C08 WhatsApp message lists only what is missing and says accounts stay in the seller's name", () => {
  const st = checklistStatus(setup({ pan: "", bankVerified: false }), { email: "x@y.com" });
  const m = checklistMessage("Lakshmi", st);
  assert.match(m, /PAN card/); assert.match(m, /Bank account/); assert.doesNotMatch(m, /1\. GST number/);
  assert.match(m, /YOUR name, YOUR mobile number/); assert.match(m, /no password sharing/);
  assert.match(checklistMessage("Lakshmi", checklistStatus(full(), { email: "x@y.com" })), /Everything we need is ready/);
});
