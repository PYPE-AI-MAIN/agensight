"use client" 

import React from "react"
import { TracesTable } from "@/components/traces-table/index"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { useEffect, useState, useCallback } from "react"
import AgentGraph from "@/components/agent-graph"
import { AgentInfo } from "@/components/agent-info"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IconGitBranch, IconVersions, IconGitCommit, IconLayoutGrid } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTitle, DialogContent, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TraceItem } from "@/hooks/use-trace-column"
import { useTheme } from "@/components/ThemeProvider"

interface ConfigVersion {
  version: string;
  commit_message: string;
  timestamp: string;
  is_current?: boolean;
}

export default function Page() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [config, setConfig] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableVersions, setAvailableVersions] = useState<ConfigVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [syncToMain, setSyncToMain] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Get the stored tab from sessionStorage
      const storedTab = sessionStorage.getItem('dashboardActiveTab');
      // Remove it after reading
      if (storedTab) {
        sessionStorage.removeItem('dashboardActiveTab');
      }
      // Return stored tab or default
      return storedTab || "experiments";
    }
    return "experiments";
  });
  const [traces, setTraces] = useState<TraceItem[]>([]);
  const [tracesLoading, setTracesLoading] = useState(false);

  useEffect(() => {
    fetchConfigVersions(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'traces') {
      fetchTraces();
    }
  }, [activeTab]);

  const fetchConfigVersions = async (preserveCurrentSelection = false) => {
    try {
      setLoading(true);
      
      const currentSelection = preserveCurrentSelection ? selectedVersion : null;
      
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/config/versions?_t=${timestamp}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch config versions');
      }
      
      const versions = await res.json();
      console.log('Received versions from API:', versions);
      
      const filteredVersions = versions.filter((v: ConfigVersion) => 
        v.version !== 'current' && v.version.match(/^\d+\.\d+\.\d+$/)
      );
      console.log('Filtered versions for display:', filteredVersions);
      
      filteredVersions.sort((a: ConfigVersion, b: ConfigVersion) => {
        return b.version.localeCompare(a.version, undefined, { numeric: true });
      });
      
      console.log('Sorted versions:', filteredVersions.map((v: ConfigVersion) => `${v.version} (${v.commit_message})`));
      
      setAvailableVersions(filteredVersions);
      
      if (filteredVersions.length > 0) {
        if (preserveCurrentSelection && currentSelection && 
            filteredVersions.some((v: ConfigVersion) => v.version === currentSelection)) {
          console.log(`Preserving current selection: ${currentSelection}`);
        } else {
          const versionToSelect = filteredVersions[0].version;
          console.log(`Selecting newest version: ${versionToSelect}`);
          setSelectedVersion(versionToSelect);
        }
      }
    } catch (err) {
      setError('Failed to load configuration versions');
      console.error('Error fetching config versions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedVersion) return;
    
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/config?version=${selectedVersion}`);
        if (!res.ok) {
          throw new Error('Failed to fetch config');
        }
        const data = await res.json();
        setConfig(data);
      } catch (err) {
        setError('Failed to load configuration');
        console.error('Error fetching config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [selectedVersion]);

  const handleAgentClick = useCallback((agentName: string) => {
    if (!config?.agents) return;
    
    setSelectedAgent(null);
    
    setTimeout(() => {
      const agent = config.agents.find((agent: any) => agent.name === agentName);
      if (agent) {
        setSelectedAgent({...agent});
        setIsAgentModalOpen(true);
      }
    }, 10);
  }, [config]);

  const handleClearSelectedAgent = useCallback(() => {
    setSelectedAgent(null);
    setIsAgentModalOpen(false);
  }, []);

  const handleSyncToMain = async (version: string) => {
    if (!version) return;
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/config/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: version
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync to main config');
      }

      const result = await response.json();
      console.log('Sync result:', result);
      
      toast({
        title: "Success",
        description: `Synced version ${version} to main config`,
        duration: 3000,
      });
      
      await fetchConfigVersions(true);
      
    } catch (error) {
      console.error('Error syncing to main config:', error);
      toast({
        title: "Error",
        description: "Failed to sync to main config",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCommitDialog = useCallback(() => {
    setCommitMessage("");
    setSyncToMain(true);
    setIsCommitDialogOpen(true);
  }, []);
  
  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsCommitDialogOpen(open);
    if (!open) {
      setCommitMessage("");
      setSyncToMain(true);
    }
  }, []);


  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a commit message",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (!selectedVersion) {
      toast({
        title: "Error",
        description: "No version selected to commit from",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      setIsCommitting(true);
      
      console.log(`Committing new version based on selected version: ${selectedVersion}`);
      
      const response = await fetch('/api/config/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commit_message: commitMessage,
          sync_to_main: syncToMain,
          source_version: selectedVersion,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to commit changes');
      }

      const result = await response.json();
      console.log('Commit result:', result);

      setIsCommitDialogOpen(false);
      
      toast({
        title: "Success",
        description: `Created new version ${result.version} based on ${selectedVersion}`,
        duration: 3000,
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await fetchConfigVersions(false);
      
      if (result.version) {
        setSelectedVersion(result.version);
        
        try {
          const configRes = await fetch(`/api/config?version=${result.version}`);
          if (configRes.ok) {
            const updatedConfig = await configRes.json();
            setConfig(updatedConfig);
          }
        } catch (configError) {
          console.error('Error fetching new version config:', configError);
        }
      }
    } catch (error) {
      console.error('Error committing changes:', error);
      toast({
        title: "Error",
        description: "Failed to commit changes",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsCommitting(false);
    }
  };

  const handleSaveAgent = async (updatedAgent: any) => {
    try {
      setLoading(true);
      
      console.log(`Saving agent to version: ${selectedVersion}`);
      
      if (!selectedVersion) {
        toast({
          title: "Error",
          description: "No version selected to update",
          variant: "destructive",
          duration: 3000,
        });
        setLoading(false);
        return;
      }
      
      const payload = {
        agent: updatedAgent,
        commit_message: `Updated agent: ${updatedAgent.name}`,
        sync_to_main: false,
        version: selectedVersion,
      };
      
      console.log('Update agent request payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch('/api/update_agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log('Update agent raw response:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Failed to parse response: ${responseText}`);
      }
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update agent');
      }

      console.log('Update result:', result);
      
      if (result.version !== selectedVersion) {
        console.warn(`Warning: Created new version ${result.version} instead of updating ${selectedVersion}`);
      }
      
      toast({
        title: "Success",
        description: `Updated agent ${updatedAgent.name} in version ${result.version}`,
        duration: 3000,
      });
      
      const configRes = await fetch(`/api/config?version=${result.version}`);
      if (configRes.ok) {
        const updatedConfig = await configRes.json();
        setConfig(updatedConfig);
        
        if (result.version !== selectedVersion) {
          setSelectedVersion(result.version);
          fetchConfigVersions();
        }
        
        if (selectedAgent && selectedAgent.name === updatedAgent.name) {
          setSelectedAgent(updatedAgent);
        }
      }
      
    } catch (error) {
      console.error('Error updating agent:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update agent",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTraces = async () => {
    try {
      setTracesLoading(true);
      const response = await fetch('/api/traces');
      
      if (!response.ok) {
        throw new Error('Failed to fetch traces');
      }
      
      const data = await response.json();
      setTraces(data);
    } catch (err) {
      console.error('Error fetching traces:', err);
      toast({
        title: "Error",
        description: "Failed to load traces",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setTracesLoading(false);
    }
  };

  if (loading && !config) {
    return (
      <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
        <SidebarInset>
          <SiteHeader />
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <p className="text-slate-500">Loading...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (error) {
    return (
      <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
        <SidebarInset>
          <SiteHeader />
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <p className="text-red-500">{error}</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 grid-bg">
        <div className="container mx-auto py-6">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 justify-between  pb-4">
            <div className="flex-none">
              <Tabs value={activeTab} className="w-full" onValueChange={(value) => setActiveTab(value)}>
                <TabsList className="bg-white dark:bg-card p-1 rounded-lg shadow-sm">
                  <TabsTrigger 
                    value="experiments" 
                    className="px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all font-medium"
                  >
                    Experiments
                  </TabsTrigger>
                  <TabsTrigger 
                    value="traces" 
                    className="px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all font-medium"
                  >
                    Traces
                  </TabsTrigger>
                  <TabsTrigger 
                    value="evaluations" 
                    className="px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all font-medium"
                  >
                    Evaluations
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 ml-auto">
              <div className="flex items-center">
                <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-1">
                      <IconGitBranch size={16} />
                      <span className="font-medium">{selectedVersion}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {availableVersions.map((version) => (
                      <SelectItem key={version.version} value={version.version}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{version.version}</span>
                          <span className="text-muted-foreground text-xs truncate">
                            {version.commit_message}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSyncToMain(selectedVersion)}
                        disabled={loading}
                        id="sync-button"
                        className="relative overflow-hidden group hover:border-primary/50 transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                        <IconVersions size={16} className="mr-1 group-hover:text-primary transition-colors duration-300" />
                        <span className="relative z-10">Sync</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This will sync to main agensight.config.json file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleOpenCommitDialog}
                        disabled={loading}
                      >
                        <IconGitCommit size={16} className="mr-1" />
                        Commit
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Save current state as a new version</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
          
          <div className="w-full">
            {activeTab === "experiments" && (
              <div className="grid grid-cols-1 gap-6 mb-8">
                <div className="relative">
                  <div className="rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm p-2 h-[550px] overflow-hidden">
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : error ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-destructive">{error}</div>
                      </div>
                    ) : config ? (
                      <AgentGraph 
                        agents={config.agents || []} 
                        connections={config.connections || []} 
                        onNodeClick={handleAgentClick}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "traces" && (
              <div className="border rounded-lg flex flex-col bg-card/50 backdrop-blur-sm h-[550px] overflow-hidden">
                {tracesLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : traces && traces.length > 0 ? (
                  <div className="flex-1 overflow-auto w-full">
                    <TracesTable data={traces} />
                  </div>
                ) : (
                  <div className="text-center flex items-center justify-center h-full">
                    <div>
                      <IconLayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No traces available</h3>
                      <p className="text-muted-foreground mt-2">
                        Trace data will appear here when you run experiments
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "evaluations" && (
              <div className="border rounded-lg p-8 flex items-center justify-center bg-card/50 backdrop-blur-sm h-[550px]">
                <div className="text-center">
                  <IconLayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No evaluation till now</h3>
                  <p className="text-muted-foreground mt-2">
                    Evaluation data will appear here when you run experiments
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={isCommitDialogOpen} onOpenChange={setIsCommitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create New Version</DialogTitle>
            <DialogDescription>
              Save the current configuration as a new version.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 px-6">
            <div className="space-y-2">
              <Label htmlFor="commit-message" className="font-medium">Commit Message</Label>
              <Input
                id="commit-message"
                placeholder="Describe your changes"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sync-to-main"
                checked={syncToMain}
                onCheckedChange={(checked) => {
                  setSyncToMain(checked === true);
                }}
              />
              <Label htmlFor="sync-to-main" className="font-medium text-sm">
                This will sync your changes to the agensight.config.json file
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCommitDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              disabled={isCommitting} 
              onClick={handleCommit}
            >
              {isCommitting ? (
                <>
                  <div className="mr-2 animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full" />
                  Committing...
                </>
              ) : "Create Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agent Details Modal */}
      <Dialog open={isAgentModalOpen} onOpenChange={setIsAgentModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden border-0 !border-none bg-card/90 backdrop-blur-sm shadow-lg" style={{ border: 'none' }}>
          <DialogHeader className="border-0 !border-none" style={{ borderBottom: 'none' }}>
            <DialogTitle className="text-xl font-semibold">
              {selectedAgent?.name || "Agent Details"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-auto py-4">
            {selectedAgent && (
              <AgentInfo 
                agent={selectedAgent} 
                setSelectedAgent={handleClearSelectedAgent}
                configVersion={selectedVersion}
                onSave={handleSaveAgent}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
