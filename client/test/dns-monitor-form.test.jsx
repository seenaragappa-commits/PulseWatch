import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MonitorForm} from '../src/components/MonitorForm';

describe('DNS monitor form',()=>{it('renders an existing DNS target for editing',()=>{const html=renderToStaticMarkup(<MonitorForm initial={{id:7,name:'DNS example',monitorType:'DNS',target:'example.com',intervalSeconds:60,timeoutMs:1000}} onSave={()=>{}} onClose={()=>{}}/>);expect(html).toContain('DNS resolution');expect(html).toContain('Public domain');expect(html).toContain('value="example.com"');});});
