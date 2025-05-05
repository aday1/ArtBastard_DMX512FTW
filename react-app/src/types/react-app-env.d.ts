/// <reference types="react" />
/// <reference types="react-dom" />

// Ensure React namespace is defined
declare namespace React {
  interface FC<P = {}> {
    (props: P): React.ReactElement | null;
    displayName?: string;
  }
  interface ReactElement {}
  interface ReactNode {}
  
  // Add ChangeEvent interface
  interface ChangeEvent<T = Element> {
    target: T;
    currentTarget: T;
    type: string;
  }
  
  // Add StrictMode
  const StrictMode: React.FC<{ children: React.ReactNode }>;
}

// Handle JSX
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface Element extends React.ReactElement {}
}

// Declare React module to address missing imports
declare module 'react' {
  export const useState: <T>(initialState: T | (() => T)) => [T, (newState: T | ((prevState: T) => T)) => void];
  export const useEffect: (effect: () => void | (() => void), deps?: any[]) => void;
  export const useCallback: <T extends (...args: any[]) => any>(callback: T, deps: any[]) => T;
  export const useRef: <T>(initialValue: T | null) => { current: T };
  export const createContext: <T>(defaultValue: T) => React.Context<T>;
  export const useContext: <T>(context: React.Context<T>) => T;
  
  export interface Context<T> {
    Provider: {
      (props: { value: T, children: React.ReactNode }): JSX.Element;
    }
    Consumer: {
      (props: { children: (value: T) => React.ReactNode }): JSX.Element;
    }
  }
  
  export type ChangeEvent<T = Element> = React.ChangeEvent<T>;
  
  export default {
    createElement: (...args: any[]) => ({}),
    Fragment: Symbol("React.Fragment"),
    StrictMode: React.StrictMode
  };
}

// Declare React DOM module
declare module 'react-dom/client' {
  export function createRoot(container: Element | Document | DocumentFragment | null): {
    render(element: React.ReactNode): void;
    unmount(): void;
  };
  export default { createRoot };
}

// Declare JSX Runtime module
declare module 'react/jsx-runtime' {
  export const jsx: (type: any, props: any, key?: string) => any;
  export const jsxs: (type: any, props: any, key?: string) => any;
  export const Fragment: Symbol;
}

// Add React Three Fiber and Drei
declare module '@react-three/fiber' {
  export function Canvas(props: any): JSX.Element;
  export function useFrame(callback: (state: any, delta: number) => void): void;
}

declare module '@react-three/drei' {
  export function OrbitControls(props: any): JSX.Element;
  export function Grid(props: any): JSX.Element;
  export function PerspectiveCamera(props: any): JSX.Element;
  export function useHelper(ref: any, helper: any): void;
}

declare module 'three' {
  export class SpotLightHelper {}
  
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    project(camera: any): this;
  }
  
  export class SpotLight {
    position: Vector3;
    intensity: number;
    color: Color;
    angle: number;
    penumbra: number;
    decay: number;
  }
  
  export class Color {
    constructor(color?: string | number);
    constructor(r: number, g: number, b: number);
    r: number;
    g: number;
    b: number;
  }
  
  export class Euler {
    constructor(x?: number, y?: number, z?: number, order?: string);
  }
}

// Add proper types for our context hooks
declare module '../../context/ThemeContext' {
  type Theme = 'artsnob' | 'standard' | 'minimal';

  export interface ThemeContextType {
    theme: Theme;
    darkMode: boolean;
    setTheme: (theme: Theme) => void;
    toggleDarkMode: () => void;
  }

  export const useTheme: () => ThemeContextType;
  export const ThemeProvider: React.FC<{ children: React.ReactNode }>;
}

declare module '../../context/SocketContext' {
  import { Socket } from 'socket.io-client';

  export interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
    reconnect: () => void;
  }

  export const useSocket: () => SocketContextType;
  export const SocketProvider: React.FC<{ children: React.ReactNode }>;
}