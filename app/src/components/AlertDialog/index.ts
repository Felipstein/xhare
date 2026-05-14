import { _AlertDialogAction, _AlertDialogCancel } from './action';
import { _AlertDialogContent } from './content';
import { _AlertDialogDescription } from './description';
import { _AlertDialogRoot } from './root';
import { _AlertDialogTitle } from './title';
import { _AlertDialogTrigger } from './trigger';

export const AlertDialog = {
  Root: _AlertDialogRoot,
  Trigger: _AlertDialogTrigger,
  Content: _AlertDialogContent,
  Title: _AlertDialogTitle,
  Description: _AlertDialogDescription,
  Action: _AlertDialogAction,
  Cancel: _AlertDialogCancel,
};
