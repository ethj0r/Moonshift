import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { plain, Rich } from "../src/ui/Rich";

it("colours whole item names once and leaves filler words plain", () => {
  const html = renderToStaticMarkup(<Rich text="Packed: Research crate, Spare battery. The air pipe +2" />);
  expect(html).toContain('<span class="kw kw-r">Research crate</span>');
  expect(html).toContain('<span class="kw kw-p">Spare battery</span>');
  expect(html).not.toContain(">air<"); // filler, not a key concept
  expect(html).toContain('<b class="num">+2</b>');
  expect(renderToStaticMarkup(<Rich text="Shift S3 and X8.2" />)).not.toContain("num"); // codes are not numbers
  expect(plain("**Flash!** A {d:flare}")).toBe("Flash! A flare");
});
