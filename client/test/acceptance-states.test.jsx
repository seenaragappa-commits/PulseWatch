import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import App from '../src/App';
import {MonitorDetails} from '../src/components/MonitorDetails';
import {IncidentList} from '../src/components/IncidentList';

const monitor={id:1,name:'<script>alert(1)</script>',monitorType:'HTTP',url:'https://example.com',enabled:true,currentStatus:'PENDING',intervalSeconds:60,timeoutMs:1000,consecutiveFailures:0};
describe('acceptance rendering states (not browser interaction)',()=>{
 it('renders initial loading and navigation',()=>{
   const html=renderToStaticMarkup(<App/>);
   expect(html).toContain('Loading live monitoring data');expect(html).toContain('Overview');expect(html).toContain('Monitors');expect(html).toContain('Incidents');
 });
 it.each([[null,'','Loading check history'],[[],'','No checks recorded yet'],[[],'Controlled API failure','Controlled API failure']])('renders details state %# and escapes hostile names',(checks,error,expected)=>{
   const html=renderToStaticMarkup(<MonitorDetails detail={{monitor,checks,error}} onClose={()=>{}} onPage={()=>{}}/>);
   expect(html).toContain(expected);expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');
 });
 it('renders an empty incident list',()=>{
   expect(renderToStaticMarkup(<IncidentList incidents={[]} onOpen={()=>{}}/>)).toContain('No incidents');
 });
});
