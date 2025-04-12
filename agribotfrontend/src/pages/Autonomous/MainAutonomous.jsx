import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Controls,
  MiniMap,
  Background,
  Handle,
  Position,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { nanoid } from 'nanoid';
import { toast, Toaster } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Play,
  Trash2,
  Edit,
  Copy,
  Save,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import PageContainer from '@/components/layout/PageContainer';
import TextHeader from '@/components/PageHeaders/TextHeader';
import { ref, set, onValue } from 'firebase/database';
import { database } from '@/firebase/firebaseConfig';

// Predefined command blocks with different categories
const predefinedBlocks = [
  { command: 'f', label: 'Forward', delay: 3000, category: 'basic' },
  { command: 'l', label: 'Left', delay: 3000, category: 'basic' },
  { command: 's', label: 'Stop', delay: 0, category: 'basic' },
  { command: 'r', label: 'Right', delay: 3000, category: 'basic' },
  { command: 'b', label: 'Backward', delay: 3000, category: 'basic' },
  { command: 'send', label: 'Send', delay: 3000, category: 'basic' },
  { command: 'servo 2 80', label: 'Base Rotation Left', delay: 3000, category: 'advanced' },
  { command: 'servo 2 63', label: 'Base Rotation Stop', delay: 3000, category: 'advanced' },
  { command: 'servo 2 30', label: 'Base Rotation Right', delay: 3000, category: 'advanced' },
  { command: 'servo 3 10', label: 'Camera Angle Up', delay: 3000, category: 'advanced' },
  { command: 'servo 3 40', label: 'Camera Angle Middle', delay: 3000, category: 'advanced' },
  { command: 'servo 3 90', label: 'Camera Angle Down', delay: 3000, category: 'advanced' },
  { command: 'servo 1 90', label: 'Soil Sensor In', delay: 3000, category: 'advanced' },
  { command: 'servo 1 120', label: 'Soil Sensor Out', delay: 3000, category: 'advanced' },
];

// Color mapping for different command categories
const categoryColors = {
  basic: '#e9f5ff',
  advanced: '#f0f0ff',
  timing: '#fff8e6',
  default: '#ffffff',
};

// Custom styled node component for command blocks
const CommandNode = ({ id, data, selected }) => {
  const category = data.category || 'default';
  const bgColor = categoryColors[category] || categoryColors.default;

  return (
    <div
      className={cn(
        'group rounded-md shadow-md transition-all duration-200',
        selected ? 'ring-2 ring-primary ring-offset-2' : 'ring-0',
      )}
      style={{
        background: bgColor,
        minWidth: 150,
      }}
    >
      <Handle
        type='target'
        position={Position.Top}
        className='!bg-slate-400 !w-3 !h-3'
      />
      <div className='p-3 text-center'>
        <div className='font-bold text-base'>{data.label}</div>
        <div className='text-xs text-slate-600 mt-1 space-y-1'>
          <div>
            Command: <span className='font-mono'>{data.command}</span>
          </div>
          <div>
            Delay: <span className='font-mono'>{data.delay}ms</span>
          </div>
        </div>
      </div>
      <Handle
        type='source'
        position={Position.Bottom}
        className='!bg-slate-400 !w-3 !h-3'
      />
    </div>
  );
};

const MainAutonomous = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState({ label: '', delay: 0 });
  const [activeTab, setActiveTab] = useState('basic');
  const [showHelpTip, setShowHelpTip] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    const connectedRef = ref(database, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    });
    sendCommand('S');
    return () => unsubscribe();
  }, []);

  const sendCommand = async command => {
    try {
      const commandRef = ref(database, 'esp32_old/triggers');
      await set(commandRef, {
        command: command,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(error);
    }
  };


  // Memoize nodeTypes to prevent unnecessary re-creation on each render
  const nodeTypes = useMemo(() => ({ commandNode: CommandNode }), []);

  // Load nodes/edges from localStorage when component mounts
  useEffect(() => {
    try {
      const storedNodes = localStorage.getItem('flowNodes');
      const storedEdges = localStorage.getItem('flowEdges');
      if (storedNodes && storedEdges) {
        setNodes(JSON.parse(storedNodes));
        setEdges(JSON.parse(storedEdges));
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      toast.error('Could not load saved flow from storage.');
    }
  }, []);

  // Handlers for React Flow changes
  const onNodesChange = useCallback(changes => {
    setNodes(nds => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback(changes => {
    // Filter out removals (delete edge when the user clicks the delete button)
    const edgesToRemove = changes
      .filter(change => change.type === 'remove')
      .map(change => change.id);

    setEdges(eds => {
      if (edgesToRemove.length > 0) {
        // toast.success('Connection removed');
        console.log("")
      }
      return applyEdgeChanges(changes, eds);
    });
  }, []);

  const onConnect = useCallback(params => {
    setEdges(eds => addEdge(params, eds));
    // toast.success('Nodes connected');
  }, []);

  // Allow dropping predefined blocks onto the canvas
  const onDragOver = useCallback(event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    event => {
      event.preventDefault();

      if (!reactFlowInstance) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      let data;

      try {
        data = JSON.parse(event.dataTransfer.getData('application/reactflow'));
      } catch (error) {
        console.error('Error parsing drag data:', error);
        return;
      }

      if (!data) return;

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: nanoid(),
        type: 'commandNode',
        position,
        data: { ...data },
      };

      setNodes(nds => nds.concat(newNode));
      // toast.success(`Added "${data.label}" command`);
    },
    [reactFlowInstance],
  );

  // Save/Load flow to/from localStorage
  const saveFlow = () => {
    try {
      localStorage.setItem('flowNodes', JSON.stringify(nodes));
      localStorage.setItem('flowEdges', JSON.stringify(edges));
      toast.success('Flow saved successfully');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      toast.error('Failed to save flow');
    }
  };

  const loadFlow = () => {
    try {
      const storedNodes = localStorage.getItem('flowNodes');
      const storedEdges = localStorage.getItem('flowEdges');
      if (storedNodes && storedEdges) {
        setNodes(JSON.parse(storedNodes));
        setEdges(JSON.parse(storedEdges));
        toast.success('Flow loaded successfully');
      } else {
        toast.info('No saved flow found');
      }
    } catch (error) {
      console.error('Error loading flow:', error);
      toast.error('Failed to load flow');
    }
  };

  // Helper function for duplicate labeling
  const getDuplicateLabel = baseLabel => {
    const cleanLabel = baseLabel.replace(/\s\(\d+\)$/, '');
    const duplicateCount = nodes.filter(node =>
      node.data.label.startsWith(cleanLabel),
    ).length;
    return `${cleanLabel} (${duplicateCount})`;
  };

  // Duplicate the selected node
  const duplicateNode = () => {
    if (!selectedNode) return;
    const newId = nanoid();
    const newLabel = getDuplicateLabel(selectedNode.data.label);
    const newNode = {
      ...selectedNode,
      id: newId,
      position: {
        x: selectedNode.position.x + 50,
        y: selectedNode.position.y + 50,
      },
      data: { ...selectedNode.data, label: newLabel },
    };
    setNodes(nds => nds.concat(newNode));
    // toast.success(`Duplicated "${selectedNode.data.label}" command`);
  };

  // Edit node dialog handlers
  const openEditDialog = () => {
    if (!selectedNode) return;
    setEditValues({
      label: selectedNode.data.label,
      delay: selectedNode.data.delay,
    });
    setIsEditDialogOpen(true);
  };

  const saveNodeEdit = () => {
    setNodes(nds =>
      nds.map(node =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                label: editValues.label,
                delay: parseInt(editValues.delay, 10),
              },
            }
          : node,
      ),
    );
    setIsEditDialogOpen(false);
    // toast.success('Command updated');
  };

  // Delete the selected node and remove any connected edges
  const deleteNode = () => {
    if (!selectedNode) return;

    // Get the node label for the toast message
    const nodeLabel = selectedNode.data.label;

    setNodes(nds => nds.filter(node => node.id !== selectedNode.id));
    setEdges(eds =>
      eds.filter(
        edge =>
          edge.source !== selectedNode.id && edge.target !== selectedNode.id,
      ),
    );
    setSelectedNode(null);

    // toast.success(`"${nodeLabel}" command removed`);
  };

  // Clear the entire flow
  const clearFlow = () => {
    if (nodes.length === 0 && edges.length === 0) {
      toast.info('Flow already empty');
      return;
    }

    setNodes([]);
    setEdges([]);
    setSelectedNode(null);

    toast.success('Flow cleared');
  };

  // Execute commands from the nodes in sequence
  const executeCommands = async () => {
    if (nodes.length === 0) {
      toast.error('No commands to execute');
      return;
    }

    setIsExecuting(true);
    toast.info('Autonomous sequence started');

    try {
      // For demo purposes, we sort nodes by y-position (top-to-bottom order)
      const sortedNodes = [...nodes].sort(
        (a, b) => a.position.y - b.position.y,
      );

      for (const node of sortedNodes) {
        // Highlight the currently executing node
        setNodes(nds =>
          nds.map(n => ({
            ...n,
            style:
              n.id === node.id
                ? { ...n.style, boxShadow: '0 0 0 2px #22c55e' }
                : n.style,
          })),
        );

        console.log(
          `Executing: ${node.data.label} (Cmd: ${node.data.command})`,
        );

        try {
          await sendCommand(node.data.command);
          toast.info(`Executing: ${node.data.label}`);
        } catch (error) {
          console.error(`Error executing ${node.data.label}:`, error);
          toast.error(`Failed to execute "${node.data.label}"`);
        }

        // Wait for the specified delay
        await new Promise(resolve => setTimeout(resolve, node.data.delay));

        // Remove highlighting
        setNodes(nds =>
          nds.map(n => ({
            ...n,
            style:
              n.id === node.id ? { ...n.style, boxShadow: 'none' } : n.style,
          })),
        );
      }

      toast.success('Sequence completed successfully');
    } catch (error) {
      console.error('Error in execution sequence:', error);
      toast.error('Execution error occurred');
    } finally {
      setIsExecuting(false);
    }
  };

  // Dismiss the help tip
  const dismissHelpTip = () => {
    setShowHelpTip(false);
  };

  return (
    <PageContainer scrollable>
      <TextHeader title='Autonomous Control' description='Create and execute autonomous sequences' />
      <div className='flex overflow-hidden bg-slate-50 h-full max-h-[calc(100vh-5.6rem)]'>
        <aside className='w-56 border-r border-slate-200 bg-slate-100 flex flex-col h-full'>
          <div className='py-1 border-b border-slate-200 bg-white'>
            <h2 className='text-xl font-bold mb-1'>Command Library</h2>
            <p className='text-sm text-slate-500'>
              Drag commands to the canvas
            </p>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='flex-1 flex flex-col'
          >
            <div className='px-2 pt-2'>
              <TabsList className='w-full grid grid-cols-2'>
                <TabsTrigger value='basic'>Basic</TabsTrigger>
                <TabsTrigger value='advanced'>Advanced</TabsTrigger>
              </TabsList>
            </div>
            <ScrollArea className='flex-1 p-2 overflow-scroll max-h-[calc(100vh-20.5rem)]'>
              {['basic', 'advanced'].map(category => (
                <TabsContent key={category} value={category} className='mt-0'>
                  <div className='space-y-2 '>
                    {predefinedBlocks
                      .filter(block => block.category === category)
                      .map((block, index) => (
                        <Card
                          key={index}
                          className='cursor-grab hover:shadow-md transition-shadow'
                          style={{ background: categoryColors[block.category] }}
                          onDragStart={event => {
                            event.dataTransfer.setData(
                              'application/reactflow',
                              JSON.stringify(block),
                            );
                          }}
                          draggable
                        >
                          <CardContent className='p-3'>
                            <div className='font-bold'>{block.label}</div>
                            <div className='text-xs text-slate-600 mt-1'>
                              <div>
                                Cmd:{' '}
                                <span className='font-mono'>
                                  {block.command}
                                </span>
                              </div>
                              <div>
                                Delay:{' '}
                                <span className='font-mono'>
                                  {block.delay}ms
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
          <div className='p-3 border-t border-slate-200'>
            <div className='space-y-2'>
              <Button
                className='w-full flex items-center justify-center'
                onClick={saveFlow}
              >
                <Save className='mr-2 h-4 w-4' />
                Save Flow
              </Button>
              <Button
                className='w-full flex items-center justify-center'
                variant='outline'
                onClick={loadFlow}
              >
                <Upload className='mr-2 h-4 w-4' />
                Load Flow
              </Button>
              <Button
                className='w-full flex items-center justify-center'
                variant='destructive'
                onClick={clearFlow}
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Clear Flow
              </Button>
            </div>
          </div>
        </aside>
        <div
          className='reactflow-wrapper flex-1 relative'
          ref={reactFlowWrapper}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={(event, node) => {
              setSelectedNode(node);
              event.stopPropagation();
            }}
            onPaneClick={() => setSelectedNode(null)}
            deleteKeyCode='Delete'
            // fitView
            proOptions={{ hideAttribution: true }}
          >
            <Controls />
            <MiniMap nodeStrokeWidth={3} zoomable pannable />
            <Background color='#aaa' gap={16} />
            {showHelpTip && (
              <Panel position='top-center' className='mt-2'>
                <div className='bg-amber-50 border border-amber-200 rounded-md p-3 shadow-md flex items-center'>
                  <AlertCircle className='h-5 w-5 text-amber-500 mr-2' />
                  <div className='flex-1 text-sm text-amber-700'>
                    Drag command blocks from the sidebar and connect them to
                    create an autonomous sequence. Click on a connection line
                    and press Delete to remove it.
                  </div>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='ml-2 text-amber-700'
                    onClick={dismissHelpTip}
                  >
                    Dismiss
                  </Button>
                </div>
              </Panel>
            )}

            {/* Action buttons panel - fixed at the bottom */}
            <Panel position='bottom-center' className='mb-4'>
              <div className='bg-white/90 backdrop-blur-sm shadow-md rounded-md p-2 flex space-x-2'>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={executeCommands}
                        disabled={isExecuting || nodes.length === 0}
                        className='bg-green-600 hover:bg-green-700'
                      >
                        <Play className='mr-2 h-4 w-4' />
                        {isExecuting ? 'Executing...' : 'Start Autonomous'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Execute the autonomous sequence
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {selectedNode && (
                  <>
                    <Separator orientation='vertical' className='h-8' />

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={openEditDialog}
                            variant='outline'
                            disabled={isExecuting}
                          >
                            <Edit className='mr-2 h-4 w-4' />
                            Edit
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit selected command</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={duplicateNode}
                            variant='outline'
                            disabled={isExecuting}
                          >
                            <Copy className='mr-2 h-4 w-4' />
                            Duplicate
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Duplicate selected command
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={deleteNode}
                            variant='destructive'
                            disabled={isExecuting}
                          >
                            <Trash2 className='mr-2 h-4 w-4' />
                            Delete
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete selected command</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Edit Command Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>Edit Command</DialogTitle>
              <DialogDescription>
                Modify the properties of the selected command.
              </DialogDescription>
            </DialogHeader>

            <div className='grid gap-4 py-4'>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='label' className='text-right'>
                  Label
                </Label>
                <Input
                  id='label'
                  value={editValues.label}
                  onChange={e =>
                    setEditValues({ ...editValues, label: e.target.value })
                  }
                  className='col-span-3'
                />
              </div>
              <div className='grid grid-cols-4 items-center gap-4'>
                <Label htmlFor='delay' className='text-right'>
                  Delay (ms)
                </Label>
                <Input
                  id='delay'
                  type='number'
                  value={editValues.delay}
                  onChange={e =>
                    setEditValues({ ...editValues, delay: e.target.value })
                  }
                  className='col-span-3'
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type='button'
                variant='secondary'
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type='button' onClick={saveNodeEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
};

export default MainAutonomous;
