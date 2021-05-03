/*
 * Copyright 2021 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { DefaultCacheClient } from './CacheClient';
import cacheManager from 'cache-manager';

describe('CacheClient', () => {
  const pluginId = 'test';
  const defaultTtl = 60;
  const onError = 'returnEmpty';
  let client: cacheManager.Cache;
  const b64 = (k: string) => Buffer.from(k).toString('base64');

  beforeEach(() => {
    client = cacheManager.caching({ store: 'none', ttl: 0 });
    client.get = jest.fn();
    client.set = jest.fn();
    client.del = jest.fn();
  });

  afterEach(() => jest.resetAllMocks());

  describe('CacheClient.get', () => {
    it('calls client with normalized key', async () => {
      const sut = new DefaultCacheClient({
        client,
        defaultTtl,
        pluginId,
        onError,
      });
      const keyPartial = 'somekey';

      await sut.get(keyPartial);

      expect(client.get).toHaveBeenCalledWith(b64(`${pluginId}:${keyPartial}`));
    });

    it('calls client with normalized key (very long key)', async () => {
      const sut = new DefaultCacheClient({
        client,
        defaultTtl,
        pluginId,
        onError,
      });
      const keyPartial = 'x'.repeat(251);

      await sut.get(keyPartial);

      const spy = client.get as jest.Mock;
      const actualKey = spy.mock.calls[0][0];
      expect(actualKey).not.toEqual(b64(`${pluginId}:${keyPartial}`));
      expect(actualKey.length).toBeLessThan(250);
    });

    it('performs deserialization on returned data', async () => {
      const expectedValue = { some: 'value' };
      const sut = new DefaultCacheClient({
        client,
        defaultTtl,
        pluginId,
        onError,
      });
      client.get = jest.fn().mockResolvedValue(JSON.stringify(expectedValue));

      const actualValue = await sut.get('someKey');

      expect(actualValue).toMatchObject(expectedValue);
    });

    it('returns undefined on any underlying error', async () => {
      const sut = new DefaultCacheClient({
        client,
        defaultTtl,
        pluginId,
        onError,
      });
      client.get = jest.fn().mockRejectedValue(undefined);

      const actualValue = await sut.get('someKey');

      expect(actualValue).toStrictEqual(undefined);
    });

    it('rejects on underlying error if configured', async () => {
      const sut = new DefaultCacheClient({
        client,
        defaultTtl,
        pluginId,
        onError: 'reject',
      });
      const expectedError = new Error('Some runtime error');
      client.get = jest.fn().mockRejectedValue(expectedError);

      return expect(sut.get('someKey')).rejects.toEqual(expectedError);
    });
  });

  describe('CacheClient.set', () => {
    it('calls client with normalized key', async () => {
      const sut = new DefaultCacheClient({
        client,
        defaultTtl,
        pluginId,
        onError,
      });
      const keyPartial = 'somekey';

      await sut.set(keyPartial, {});

      const spy = client.set as jest.Mock;
      const actualKey = spy.mock.calls[0][0];
      expect(actualKey).toEqual(b64(`${pluginId}:${keyPartial}`));
    });

    it('performs serialization on given data', async () => {
      const sut = new DefaultCacheClient({
        client,
        defaultTtl,
        pluginId,
        onError,
      });
      const expectedData = { some: 'value' };

      await sut.set('someKey', expectedData);

      const spy = client.set as jest.Mock;
      const actualData = spy.mock.calls[0][1];
      expect(actualData).toEqual(JSON.stringify(expectedData));
    });

    it('passes ttl to client when given', async () => {
      const sut = new DefaultCacheClient({
        client,
        defaultTtl,
        pluginId,
        onError,
      });
      const expectedTtl = 3600;

      await sut.set('someKey', {}, { ttl: expectedTtl });

      const spy = client.set as jest.Mock;
      const actualOptions = spy.mock.calls[0][2];
      expect(actualOptions.ttl).toEqual(expectedTtl);
    });

    it('passes defaultTtl to client when not', async () => {
      const sut = new DefaultCacheClient({
        client,
        defaultTtl,
        pluginId,
        onError,
      });

      await sut.set('someKey', {});

      const spy = client.set as jest.Mock;
      const actualOptions = spy.mock.calls[0][2];
      expect(actualOptions.ttl).toEqual(defaultTtl);
    });

    it('does not reject on any client error by default', async () => {
      const sut = new DefaultCacheClient({
        client,
        defaultTtl,
        pluginId,
        onError,
      });
      client.set = jest.fn().mockRejectedValue(undefined);

      return expect(sut.set('someKey', {})).resolves.toBeUndefined();
    });

    it('rejects on underlying error if configured', async () => {
      const sut = new DefaultCacheClient({
        client,
        defaultTtl,
        pluginId,
        onError: 'reject',
      });
      const expectedError = new Error('Some runtime error');
      client.set = jest.fn().mockRejectedValue(expectedError);

      return expect(sut.set('someKey', {})).rejects.toEqual(expectedError);
    });
  });

  describe('CacheClient.delete', () => {
    it('calls client with normalized key', async () => {
      const sut = new DefaultCacheClient({
        client,
        defaultTtl,
        pluginId,
        onError,
      });
      const keyPartial = 'somekey';

      await sut.delete(keyPartial);

      const spy = client.del as jest.Mock;
      const actualKey = spy.mock.calls[0][0];
      expect(actualKey).toEqual(b64(`${pluginId}:${keyPartial}`));
    });

    it('does not reject on any client error by default', async () => {
      const sut = new DefaultCacheClient({
        client,
        defaultTtl,
        pluginId,
        onError,
      });
      client.del = jest.fn().mockRejectedValue(undefined);

      return expect(sut.delete('someKey')).resolves.toBeUndefined();
    });

    it('rejects on underlying error if configured', async () => {
      const sut = new DefaultCacheClient({
        client,
        defaultTtl,
        pluginId,
        onError: 'reject',
      });
      const expectedError = new Error('Some runtime error');
      client.del = jest.fn().mockRejectedValue(expectedError);

      return expect(sut.delete('someKey')).rejects.toEqual(expectedError);
    });
  });
});
