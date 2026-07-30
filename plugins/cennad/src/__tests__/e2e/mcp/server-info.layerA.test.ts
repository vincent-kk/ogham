/**
 * @file server-info.layerA.test.ts
 * @description Layer A — 클라이언트가 보는 서버 identity 가 패키지 값과 일치한다.
 *
 * `createServer` 가 이름·버전을 어디서 받든(모듈 상수든 인자든) 호스트에 보고되는
 * 값은 같아야 한다. 이 단정이 그 계약을 고정한다.
 */
import { describe, expect, it } from 'vitest';

import { VERSION } from '../../../version.js';
import { makeLayerAClient } from '../helpers/mcpClientLayerA.js';

describe('server info (Layer A)', () => {
  it('reports the package name and version to the client', async () => {
    const { client, close } = await makeLayerAClient();
    try {
      expect(client.getServerVersion()).toMatchObject({
        name: 'tools',
        version: VERSION,
      });
    } finally {
      await close();
    }
  });
});
