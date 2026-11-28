// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared result shapes for the rotate-image UI and result list.

export interface RotatedFile {
  name: string;
  sourceName: string;
  blob: Blob;
  width: number;
  height: number;
}

export interface Failure {
  name: string;
  message: string;
}
