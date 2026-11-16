import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MonitorForm} from '../src/components/MonitorForm';
import {MonitorDetails} from '../src/components/MonitorDetails';
import {IncidentDetails} from '../src/components/IncidentDetails';
it('renders TCP configuration, port, history and incident type',()=>{
  const monitor={name:'Public TCP',monitorType:'TCP',target:'example.com',tcpPort:443,enabled:true,currentStatus:'UP',intervalSeconds:60,timeoutMs:1000};
  expect(renderToStaticMarkup(<MonitorForm initial={monitor}/>)).toContain('Approved port');
  const html=renderToStaticMarkup(<MonitorDetails detail={{monitor,checks:[{id:1,status:'UP',response_time_ms:7}],pagination:{page:1,pages:1,total:1}}}/>);
  expect(html).toContain('TCP connection');expect(html).toContain('443');expect(html).toContain('7 ms');
  expect(renderToStaticMarkup(<IncidentDetails incident={{monitor_type:'TCP',status:'RESOLVED',recovery_details:'Recovered with TCP connection'}}/>)).toContain('Recovered with TCP connection');
});
