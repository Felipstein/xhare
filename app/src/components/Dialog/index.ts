import { _DialogClose } from './close';
import { _DialogContent } from './content';
import { _DialogDescription } from './description';
import { _DialogRoot } from './root';
import { _DialogTitle } from './title';
import { _DialogTrigger } from './trigger';

export const Dialog = {
  Root: _DialogRoot,
  Trigger: _DialogTrigger,
  Content: _DialogContent,
  Title: _DialogTitle,
  Description: _DialogDescription,
  Close: _DialogClose,
};
