// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared result shapes for the compress-image UI and its result list.

export interface CompressedFile {
  name: string;
  sourceName: string;
  blob: Blob;
  originalBytes: number;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

export interface Failure {
  name: string;
  message: string;
}
