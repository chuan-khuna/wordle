# 02: Opener Split: figures and comparing two Openers

**What to build:** On the Opener Split page, the reader sees five figures beside the split: number of groups, largest group, number of single-word groups, Expected Information and Expected Candidates. A "Compare" button adds a second Opener, shown below the first with its own figures and `SplitGroups`, so that a good Opener and a bad one (say TRACE and FUZZY) can be read one above the other. The second Opener can be removed again. See [the spec](../spec.md).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The figures come from the split response, except the single-word group count, which the split-groups module computes (covered by `bun test`).
- [ ] Expected Information and Expected Candidates are formatted as elsewhere on the site (as in the Feedback Split explorer's chart title).
- [ ] "Compare" adds a second Opener input and split. A remove control takes it away. The `compare` URL param holds the second Opener.
- [ ] Each Opener's input reports its own errors without clearing the other's split.
- [ ] The two splits are stacked one above the other on every width.
- [ ] Page text for the figures and Compare exists in English and Thai.
- [ ] `bun run screenshot` includes a compare view.
- [ ] `web-frontend.md` describes the figures and Compare.
