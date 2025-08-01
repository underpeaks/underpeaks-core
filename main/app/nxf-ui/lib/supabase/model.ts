'use server';

import { supabase } from './client';
import { SharedModel } from '../types/model';
import { v4 as uuidv4 } from 'uuid';

export async function createModel(model: SharedModel) {
  const modelToInsert = {
    id: model.id || uuidv4(),
    project_id: model.project_id,
    name: model.name,
    schema: model.schema,
  };

  const { data, error } = await supabase.from('models').insert([modelToInsert]);

  if (error) throw error;
  return data;
}

export async function getModels(projectId: string) {
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAllModels() {
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateModel(
  id: string, 
  projectId: string, 
  updates: { 
    name: string; 
    schema: Record<string, { type: string; required?: boolean }>;
  }
) {
  const { error } = await supabase
    .from('models')
    .update({
      name: updates.name,
      schema: updates.schema,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('project_id', projectId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}


export async function getModelById(id: string, projectId: string) {
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .eq('id', id)
    .eq('project_id', projectId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Add this new function to get models by project ID
export async function getModelsByProject(projectId: string) {
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteModel(id: string, projectId: string) {
  const { error } = await supabase
    .from('models')
    .delete()
    .eq('id', id)
    .eq('project_id', projectId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
