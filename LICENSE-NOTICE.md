# Licence

OpenDrawer is licensed under the **GNU Affero General Public License, version 3 or later**
(`AGPL-3.0-or-later`).

## Why AGPL and not MIT

Three of the strongest engines needed for a genuinely useful PDF suite are copyleft:

- **Ghostscript** (strong compression, PDF/A) — AGPL-3.0
- **MuPDF** (alternative renderer/editor) — AGPL-3.0
- **PDF.js** and **pdf-lib** are permissive, but the compression and repair features people
  actually need come from the copyleft side.

Mixing AGPL components into an MIT project would be a licence violation. Choosing AGPL for the
whole project is the honest option: it keeps every tool free, and it prevents a company from
taking the work, hosting it as a paid service, and shipping their improvements closed — which is
exactly the behaviour this project exists to oppose. Stirling PDF, PDFsam and OCRmyPDF make the
same choice.

If you need a permissively licensed subset, you can use pdf-lib + PDF.js + qpdf only (MIT,
Apache-2.0, Apache-2.0) and skip Ghostscript. That subset cannot compress scans well. Any such
fork must remove the AGPL engines entirely, not merely exclude them from the build.

## What this means for you

**Using the site:** nothing. No account, no licence fee, no attribution required for the files
you process. Your documents remain entirely yours.

**Self-hosting it unmodified:** allowed and encouraged.

**Running a modified version as a public service:** you must offer the source of your modified
version to its users. That is the whole point of the Affero clause.

**Embedding it in a commercial product:** permitted, but the combined work must be AGPL. If that
is unacceptable, contact the maintainer about a separate arrangement — note that Ghostscript and
MuPDF would still impose their own terms.

## Obligations to satisfy before the first release

1. Add the full AGPL-3.0 text as `LICENSE` (copy verbatim from <https://www.gnu.org/licenses/agpl-3.0.txt>;
   do not retype or paraphrase it). This file is a notice, not the licence.
2. Add a `THIRD-PARTY-NOTICES.md` listing every runtime dependency, its version, licence and
   upstream URL, including the exact build flags used for any vendored WASM binary.
3. Show "Source code" and "Licence" links in the site footer on every page.
4. In the app's About page, state the licence and link to the running version's source. Because
   the app is served over a network, this link is a licence obligation, not a courtesy.
5. Add `SPDX-License-Identifier: AGPL-3.0-or-later` headers to every source file.
6. Ensure no dependency adds terms incompatible with AGPL (no proprietary SDKs, no
   "source-available, non-commercial" packages).
7. Contributors sign off with the Developer Certificate of Origin (`git commit -s`). No copyright
   assignment is required.

## Trademark

The AGPL covers code, not names. "OpenDrawer" as a project name and any logo are not licensed
for use in a way that suggests your fork is the official project. Forks should use a different
name and state clearly that they are forks.

## No warranty

The software is provided "as is", without warranty of any kind. In plain language: it is a tool,
not a professional service. A PDF that matters should be kept somewhere safe before you process
it, and the app should always say so.
