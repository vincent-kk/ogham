import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeBinary } from '../lib/file-io.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

describe('writeBinary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates parent directories and writes binary data', async () => {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const buffer = new ArrayBuffer(4);
    new Uint8Array(buffer).set([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes

    await writeBinary('/tmp/test/output.png', buffer);

    expect(mkdir).toHaveBeenCalledWith('/tmp/test', { recursive: true });
    expect(writeFile).toHaveBeenCalledWith('/tmp/test/output.png', Buffer.from(buffer));
  });

  it('passes ArrayBuffer through Buffer.from correctly', async () => {
    const { writeFile } = await import('node:fs/promises');
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const buffer = data.buffer as ArrayBuffer;

    await writeBinary('/tmp/data.bin', buffer);

    const writtenData = (writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1] as Buffer;
    expect(writtenData).toEqual(Buffer.from([1, 2, 3, 4, 5]));
  });
});
