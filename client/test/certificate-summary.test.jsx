import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MonitorDetails} from '../src/components/MonitorDetails';
const monitor={name:'Certificate',monitorType:'SSL',enabled:true,currentStatus:'UP'};
const history=[{id:1,status:'UP',certificate_issuer:'Historical CA',certificate_expires_in_days:5,checked_at:'2026-11-01T00:00:00Z'}];
it('keeps the latest certificate summary separate from historical page metadata',()=>{
 const html=renderToStaticMarkup(<MonitorDetails detail={{monitor,latestCheck:{certificate_issuer:'Current CA',certificate_expires_in_days:47},checks:history,pagination:{page:2,pages:2,total:21}}}/>);
 expect(html).toContain('Current CA');expect(html).not.toContain('Historical CA');expect(html).toContain('5 days');expect(history[0].certificate_issuer).toBe('Historical CA');
});
it('does not present an old certificate as current when the latest check has no metadata',()=>{
 const html=renderToStaticMarkup(<MonitorDetails detail={{monitor,latestCheck:{status:'DOWN'},checks:history}}/>);
 expect(html).not.toContain('Historical CA');expect(html).toContain('5 days');
});
