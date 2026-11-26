// SPDX-License-Identifier: AGPL-3.0-or-later
// The full tool catalogue, assembled from the two group files so no single file grows unbounded.

import { coreTools } from './tool-entries-core';
import { editTools } from './tool-entries-edit';
import type { ToolEntry } from './tools';

export const tools: ToolEntry[] = [...coreTools, ...editTools];
