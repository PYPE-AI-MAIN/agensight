from flask import Blueprint, request, jsonify
import json
import logging
import os
import copy
import datetime
from ..utils.config_utils import (
    get_config_file_path, get_version, save_version, get_next_version_number,
    get_version_history, get_latest_version_number
)

logger = logging.getLogger(__name__)
prompt_bp = Blueprint('prompt', __name__)

# This route is maintained for backward compatibility
# New applications should use /api/update_agent instead
@prompt_bp.route('/api/update_prompt', methods=['POST'])
def update_prompt():
    logger.warning("The /api/update_prompt endpoint is deprecated. Please use /api/update_agent instead.")
    try:
    data = request.json
    name = data.get('name')
    prompt_text = data.get('prompt')
        version = data.get('version')  # Can be used both for loading a specific version and for specifying a new version
        commit_message = data.get('commit_message', 'Updated prompt')
        
        if name is None or prompt_text is None:
        return jsonify({'error': 'Missing required fields'}), 400
            
        editing_versioned_file = False
        # Check if we're loading a specific version to edit
        version_config = None
        if version:
            version_config = get_version(version)
            if version_config:
                logger.info(f"Editing specific version: {version}")
                editing_versioned_file = True
                config = version_config
            else:
                # Version not found, assume it's a new version number
                with open(get_config_file_path(), 'r') as f:
                    config = json.load(f)
                    logger.info("Version not found, editing current config with specified new version")
        else:
            # Edit the current config
            with open(get_config_file_path(), 'r') as f:
            config = json.load(f)
                logger.info("Editing current config")
                
        # Find the agent
        agent = next((a for a in config['agents'] if a['name'] == name), None)
        if not agent:
            return jsonify({'error': 'Agent not found'}), 404
            
        # If editing current config, create a backup first
        if not editing_versioned_file:
            # Create a new version of the config
            new_config = copy.deepcopy(config)
            
            # Find the agent in the new config
            new_agent = next((a for a in new_config['agents'] if a['name'] == name), None)
            
            # Update the prompt directly (new structure)
            new_agent['prompt'] = prompt_text
            
            # Also update modelParams if provided
            if 'modelParams' in data:
                new_agent['modelParams'] = data['modelParams']
                
            # Update version using new versioning system
            latest_version = get_latest_version_number()
            # For backward compatibility, if version is specified and not referring to existing version,
            # it could be a user-specified new version number
            specified_version = None if editing_versioned_file else version
            new_version = get_next_version_number(latest_version, specified_version)
            
            # Save the new version
            save_version(new_config, commit_message, True)  # Save and sync to main config
                
            logger.info(f"Updated prompt for agent {name} in version {new_version}")
            
            return jsonify({
                'success': True,
                'version': new_version,
                'message': f"Prompt updated successfully in version {new_version}"
            })
        else:
            # For versioned files, we're just updating the version 
            # This is mostly for internal/admin use - we don't support this in the new system
            # Reject with an appropriate message
            logger.warning(f"Attempt to modify historical version {version} directly - not supported in new versioning system")
            return jsonify({
                'error': 'Modifying historical versions directly is not supported in the new versioning system',
                'message': 'Please create a new version instead'
            }), 400
    except Exception as e:
        logger.error(f"Error updating prompt: {e}")
        return jsonify({'error': str(e)}), 500

@prompt_bp.route('/api/versions/create', methods=['POST'])
def create_version():
    """Create a new version with a specific commit message"""
    try:
        data = request.json
        commit_message = data.get('commit_message', 'Manual version creation')
        specified_version = data.get('version')  # User can optionally specify a version
        sync_to_main = data.get('sync_to_main', True)
        
        # Load the current config
        with open(get_config_file_path(), 'r') as f:
            config = json.load(f)
            
        # Create a new version using the new versioning system
        new_version = save_version(config, commit_message, sync_to_main)
            
        logger.info(f"Created new version {new_version}: {commit_message}")
            
        return jsonify({
            'success': True,
            'version': new_version,
            'message': f"Created new version {new_version}"
        })
    except Exception as e:
        logger.error(f"Error creating version: {e}")
        return jsonify({'error': str(e)}), 500