/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/bios` | `/bios`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/home` | `/home`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/NavigationDrawer` | `/NavigationDrawer`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/RunProgramButton` | `/RunProgramButton`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/schedule` | `/schedule`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/ScrollableListBios` | `/ScrollableListBios`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/ScrollableListHome` | `/ScrollableListHome`; params?: Router.UnknownInputParams; } | { pathname: `/components/CallButton`; params?: Router.UnknownInputParams; } | { pathname: `/login`; params?: Router.UnknownInputParams; };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/bios` | `/bios`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/home` | `/home`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/NavigationDrawer` | `/NavigationDrawer`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/RunProgramButton` | `/RunProgramButton`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/schedule` | `/schedule`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/ScrollableListBios` | `/ScrollableListBios`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/ScrollableListHome` | `/ScrollableListHome`; params?: Router.UnknownOutputParams; } | { pathname: `/components/CallButton`; params?: Router.UnknownOutputParams; } | { pathname: `/login`; params?: Router.UnknownOutputParams; };
      href: Router.RelativePathString | Router.ExternalPathString | `/${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/bios${`?${string}` | `#${string}` | ''}` | `/bios${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/home${`?${string}` | `#${string}` | ''}` | `/home${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/NavigationDrawer${`?${string}` | `#${string}` | ''}` | `/NavigationDrawer${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/profile${`?${string}` | `#${string}` | ''}` | `/profile${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/RunProgramButton${`?${string}` | `#${string}` | ''}` | `/RunProgramButton${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/schedule${`?${string}` | `#${string}` | ''}` | `/schedule${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/ScrollableListBios${`?${string}` | `#${string}` | ''}` | `/ScrollableListBios${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/ScrollableListHome${`?${string}` | `#${string}` | ''}` | `/ScrollableListHome${`?${string}` | `#${string}` | ''}` | `/components/CallButton${`?${string}` | `#${string}` | ''}` | `/login${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/bios` | `/bios`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/home` | `/home`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/NavigationDrawer` | `/NavigationDrawer`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/profile` | `/profile`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/RunProgramButton` | `/RunProgramButton`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/schedule` | `/schedule`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/ScrollableListBios` | `/ScrollableListBios`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/ScrollableListHome` | `/ScrollableListHome`; params?: Router.UnknownInputParams; } | { pathname: `/components/CallButton`; params?: Router.UnknownInputParams; } | { pathname: `/login`; params?: Router.UnknownInputParams; };
    }
  }
}
