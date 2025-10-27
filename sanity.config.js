'use client'

import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import {apiVersion, dataset, projectId} from './sanity/env'
import {schema} from './sanity/schemaTypes'
import {structure} from './sanity/structure'
import {SendInvoiceAction} from './sanity/actions/SendInvoiceAction'

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  schema,
  plugins: [
    structureTool({structure}),
    visionTool({defaultApiVersion: apiVersion}),
  ],
  document: {
    actions: (prev, context) => {
      // Add the SendInvoiceAction for invoice documents
      if (context.schemaType === 'invoice') {
        return [...prev, SendInvoiceAction]
      }
      return prev
    },
  },
})