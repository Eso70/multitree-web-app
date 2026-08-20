import { LinktreesService } from './linktrees.service';

/**
 * The pages list must survive the analytics tables being unavailable.
 *
 * Traffic is supplementary to that screen: an owner still has to be able to
 * see, open and edit their pages during an analytics outage. Before the
 * totals were attached, a broken analytics table could not affect this list at
 * all, so the degradation is what keeps that property.
 */
describe('getAllLinktrees when traffic totals are unavailable', () => {
  function buildService(totals: () => Promise<Map<string, unknown>>) {
    const database = {
      query: jest.fn().mockResolvedValue({
        rows: [
          {
            id: 'lt-1',
            name: 'Page',
            template_config: {},
            template_key: 'spectrum',
            whatsapp_modal_enabled: false,
          },
        ],
      }),
    };
    const service = new LinktreesService(
      database as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { linktreeTotalsForBusiness: totals } as never,
    );
    return { service, database };
  }

  it('falls back to zeroes instead of failing the list', async () => {
    const { service } = buildService(() =>
      Promise.reject(new Error('analytics_events is unavailable')),
    );

    const rows = await service.getAllLinktrees('business-id');

    expect(rows).toHaveLength(1);
    expect(rows[0].analytics).toEqual({
      unique_views: 0,
      unique_clicks: 0,
      total_clicks: 0,
    });
  });

  it('uses the totals when they are available', async () => {
    const { service } = buildService(() =>
      Promise.resolve(
        new Map([
          ['lt-1', { unique_views: 9, unique_clicks: 4, total_clicks: 20 }],
        ]),
      ),
    );

    const rows = await service.getAllLinktrees('business-id');

    expect(rows[0].analytics).toEqual({
      unique_views: 9,
      unique_clicks: 4,
      total_clicks: 20,
    });
  });
});
