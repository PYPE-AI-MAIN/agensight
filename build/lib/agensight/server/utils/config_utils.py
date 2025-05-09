import os
import json
import logging
import datetime
import copy
import glob
import re
import sys
from .file_ops import read_config, write_config

logger = logging.getLogger(__name__)

def get_user_dir():
    """
    Return the directory where the user is running the SDK (usually their project root).
    This is where agensight.config.json and .agensight should be created.
    """
    project_root = os.getcwd()
    logger.info(f"Using user's current working directory as project root: {project_root}")
    return project_root


# Constants for version management - these values will be evaluated each time they're used
def get_config_file_path():
    return os.path.join(get_user_dir(), 'agensight.config.json')

def get_version_dir_path():
    return os.path.join(get_user_dir(), '.agensight')

VERSION_FILE_PATTERN = 'version_{}.json'  # Format for individual version files


def ensure_version_directory():
    """
    Ensure the .agensight directory exists for version storage
    If it doesn't exist, create it and initialize with the current config
    
    Returns:
        bool: True if directory exists or was created successfully, False otherwise
    """
    version_dir = get_version_dir_path()
    config_file = get_config_file_path()
    
    # Print debug info about directories
    logger.info(f"[DEBUG] User directory: {get_user_dir()}")
    logger.info(f"[DEBUG] Version directory: {version_dir}")
    logger.info(f"[DEBUG] Config file: {config_file}")
    
    # Flag to track if we need to create version files
    need_to_create_files = False
    
    # Create directory if needed
    if not os.path.exists(version_dir):
        try:
            os.makedirs(version_dir, exist_ok=True)
            logger.info(f"Created version directory: {version_dir}")
            need_to_create_files = True
        except Exception as e:
            logger.error(f"Failed to create version directory: {e}")
            return False
    
    # Check if version files exist
    version_files = glob.glob(os.path.join(version_dir, VERSION_FILE_PATTERN.format('*')))
    if not version_files:
        logger.info("No version files found, need to create initial version")
        need_to_create_files = True
    
    # Create initial version file if needed
    if need_to_create_files:
        # Check if config file exists, if not create a default one
        if not os.path.exists(config_file):
            try:
                default_config = create_default_config()
                write_config(config_file, default_config)
                logger.info(f"Created default config file: {config_file}")
                config = default_config
            except Exception as e:
                logger.error(f"Failed to create default config: {e}")
                return False
        else:
            # Read existing config
            try:
                config = read_config(config_file)
                logger.info(f"Read existing config from: {config_file}")
            except Exception as e:
                logger.error(f"Failed to read config file: {e}")
                return False
        
        # Create the version file
        try:
            version_entry = {
                'version': '0.0.1',
                'commit_message': 'initial version',
                'timestamp': datetime.datetime.now().isoformat(),
                'config': config
            }
            
            version_path = get_version_file_path('0.0.1')
            with open(version_path, 'w') as f:
                json.dump(version_entry, f, indent=2)
            logger.info(f"Created initial version file: {version_path}")
        except Exception as e:
            logger.error(f"Failed to create version file: {e}")
            return False
    
    return True


def get_version_file_path(version):
    """
    Get the file path for a specific version
    
    Args:
        version (str): The version number
        
    Returns:
        str: Full path to the version file
    """
    # Add debug logging to help diagnose path formatting
    logger.info(f"[DEBUG] Building version file path for version: '{version}'")
    
    # Format the filename using the pattern
    filename = VERSION_FILE_PATTERN.format(version)
    
    # Construct the full path
    full_path = os.path.join(get_version_dir_path(), filename)
    
    logger.info(f"[DEBUG] Generated version file path: '{full_path}'")
    
    return full_path


def get_version(version_number):
    """
    Get a specific version from the version history
    
    Args:
        version_number (str): The version number to retrieve
        
    Returns:
        dict: The config at that version, or None if not found
    """
    try:
        version_path = get_version_file_path(version_number)
        if not os.path.exists(version_path):
            logger.warning(f"Version file not found: {version_path}")
            return None
            
        with open(version_path, 'r') as f:
            version_data = json.load(f)
            
        # Return just the config, not the metadata
        return version_data.get('config')
    except Exception as e:
        logger.error(f"Error getting version {version_number}: {e}")
        return None


def get_version_with_metadata(version_number):
    """
    Get a specific version with its metadata from the version history
    
    Args:
        version_number (str): The version number to retrieve
        
    Returns:
        dict: The full version data including metadata, or None if not found
    """
    try:
        version_path = get_version_file_path(version_number)
        if not os.path.exists(version_path):
            logger.warning(f"Version file not found: {version_path}")
            return None
            
        with open(version_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error getting version with metadata {version_number}: {e}")
        return None


def get_version_history():
    """
    Get all versions from the version history (metadata only)
    
    Returns:
        list: A list of version metadata (without the full configs)
    """
    try:
        ensure_version_directory()
        
        # Get all version files
        version_pattern = os.path.join(get_version_dir_path(), 'version_*.json')
        version_files = glob.glob(version_pattern)
        
        # Extract metadata from each file
        result = []
        for file_path in version_files:
            try:
                with open(file_path, 'r') as f:
                    version_data = json.load(f)
                    
                # Extract just the metadata
                if isinstance(version_data, dict) and 'version' in version_data:
                    result.append({
                        'version': version_data.get('version'),
                        'commit_message': version_data.get('commit_message', 'No commit message'),
                        'timestamp': version_data.get('timestamp', '')
                    })
            except Exception as e:
                logger.error(f"Error loading version from {file_path}: {e}")
                continue
                
        return result
    except Exception as e:
        logger.error(f"Error getting version history: {e}")
        return []


def get_latest_version_number():
    """
    Get the latest version number from the version history
    
    Returns:
        str: The latest version number or '0.0.1' if no versions exist
    """
    try:
        versions = get_version_history()
        if not versions:
            return '0.0.1'
            
        # Sort versions by timestamp (newest first)
        versions.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        latest_version = versions[0]['version']
        return latest_version
    except Exception as e:
        logger.error(f"Error getting latest version number: {e}")
        return '0.0.1'


def get_next_version_number(current_version='0.0.1', specified_version=None):
    """
    Calculate the next version number based on semantic versioning
    
    Args:
        current_version (str): The current version string
        specified_version (str, optional): User-specified version
        
    Returns:
        str: The next version number to use
    """
    # If user specified a version, validate and use it
    if specified_version:
        try:
            # Simple validation that it has the right format
            parts = specified_version.split('.')
            if len(parts) == 3 and all(part.isdigit() for part in parts):
                logger.info(f"Using user-specified version: {specified_version}")
                return specified_version
            else:
                logger.warning(f"Invalid specified version format: {specified_version}, using auto-increment instead")
        except Exception as e:
            logger.error(f"Error parsing specified version: {e}")
            # Fall through to auto-increment
    
    try:
        version_parts = current_version.split('.')
        if len(version_parts) != 3:
            logger.warning(f"Invalid version format: {current_version}, defaulting to 0.0.1")
            return '0.0.2'  # Default to 0.0.2 if format is wrong
            
        # Increment patch version
        next_patch = int(version_parts[2]) + 1
        return f"{version_parts[0]}.{version_parts[1]}.{next_patch}"
    except Exception as e:
        logger.error(f"Error calculating next version: {e}")
        return '0.0.2'  # Safe fallback


def save_version(config, commit_message=None, sync_to_main=False):
    """
    Save a version of the config to the version history
    
    Args:
        config (dict): The configuration to save
        commit_message (str, optional): A message describing the changes
        sync_to_main (bool): Whether to update the main config file
        
    Returns:
        str: The version number that was saved
    """
    ensure_version_directory()
    
    try:
        # Generate version number
        latest_version = get_latest_version_number()
        new_version = get_next_version_number(latest_version)
        
        # Create version metadata
        timestamp = datetime.datetime.now().isoformat()
        message = commit_message or 'Configuration update'
        
        # Make a clean copy of the config to save
        config_copy = copy.deepcopy(config)
        
        # Create version entry with metadata
        version_entry = {
            'version': new_version,
            'commit_message': message,
            'timestamp': timestamp,
            'config': config_copy
        }
        
        # Save as individual file
        version_path = get_version_file_path(new_version)
        with open(version_path, 'w') as f:
            json.dump(version_entry, f, indent=2)
            
        logger.info(f"Saved version {new_version}: {message}")
        
        # Update the main config file if requested
        if sync_to_main:
            try:
                write_config(get_config_file_path(), config_copy)
                logger.info(f"Updated main config file with version {new_version}")
            except Exception as e:
                logger.error(f"Error updating main config: {e}")
                # Continue despite error
        
        return new_version
            
    except Exception as e:
        logger.error(f"Error saving version: {e}")
        return None


def rollback_to_version(version, commit_message=None, sync_to_main=False):
    """
    Roll back to a specific version of the configuration
    
    Args:
        version (str): The version to roll back to
        commit_message (str, optional): A message describing the rollback
        sync_to_main (bool): Whether to update the main config file
        
    Returns:
        dict: Result dict with success, version and message
    """
    try:
        # Get the requested version
        rollback_config = get_version(version)
        if not rollback_config:
            return {
                'success': False,
                'error': f"Version {version} not found"
            }
            
        # Create default commit message if none provided
        if not commit_message:
            commit_message = f"Rolled back to version {version}"
            
        # Save as a new version
        new_version = save_version(rollback_config, commit_message, sync_to_main)
        if not new_version:
            return {
                'success': False,
                'error': 'Failed to save rollback version'
            }
            
        return {
            'success': True,
            'version': new_version,
            'synced_to_main': sync_to_main,
            'message': f"Successfully rolled back to version {version}"
        }
    except Exception as e:
        logger.error(f"Error rolling back config: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def create_default_config():
    """
    Create a default configuration when none is available
    
    Returns:
        dict: A default configuration with standard agents
    """
    logger.warning("Creating default configuration")
    return {
        "agents": [
            {
                "name": "AnalysisAgent",
                "prompt": "You are an expert medical analyst specialized in reviewing patient data and providing comprehensive insights.",
                "variables": ["patient_name", "age", "gender", "report"],
                "modelParams": {
                    "model": "gpt-4o",
                    "temperature": 0.2,
                    "top_p": 1,
                    "max_tokens": 2500
                }
            },
            {
                "name": "ModelManager",
                "prompt": "You are a model manager responsible for coordinating between different specialized agents and ensuring data flows correctly.",
                "variables": ["system_prompt", "data"],
                "modelParams": {
                    "model": "gpt-4o-mini",
                    "temperature": 0.1,
                    "top_p": 1,
                    "max_tokens": 2000
                }
            }
        ],
        "connections": [
            {"from": "AnalysisAgent", "to": "ModelManager"}
        ]
    }


def initialize_config():
    """
    Initialize the configuration system, creating default files if needed.
    Always reads from agensight.config.json for the first version.
    
    Returns:
        dict: The initialized configuration
    """
    # Create version directory and possibly initialize version
    ensure_version_directory()
    
    try:
        # Always try to read from the main config file first
        if os.path.exists(get_config_file_path()):
            config = read_config(get_config_file_path())
            logger.info("Loaded existing config from agensight.config.json")
        else:
            # Only create default if no config file exists
            config = create_default_config()
            write_config(get_config_file_path(), config)
            logger.info("Created new default config file")
        
        # Check if we already have any versions
        versions = get_version_history()
        if not versions:
            # If no versions exist yet, create the first one
            version_entry = {
                'version': '0.0.1',
                'commit_message': 'initial version',
                'timestamp': datetime.datetime.now().isoformat(),
                'config': config
            }
            
            # Create the version file
            version_path = get_version_file_path('0.0.1')
            with open(version_path, 'w') as f:
                json.dump(version_entry, f, indent=2)
            logger.info(f"Created initial version 0.0.1 from agensight.config.json")
        
        return config
    except Exception as e:
        logger.error(f"Error during initialization: {e}")
        # Return a default config as fallback
        return create_default_config() 