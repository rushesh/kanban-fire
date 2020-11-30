import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';
import { TaskDialogComponent, TaskDialogResult } from './task-dialog/task-dialog.component';
import { Task } from './task/task';

const getObservable = (collection: AngularFirestoreCollection<Task>)=>{
  const subject = new BehaviorSubject([]);
  collection.valueChanges({idField:'id'}).subscribe(
    (val: Task[])=>{
      subject.next(val);
    });
    return subject;
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private dialog: MatDialog, private store: AngularFirestore) {}

  title = 'kanban-fire';
  // todo: Task[] = [
  //   {title: 'Buy Milk', description:'Go to store to buy milk!'},
  //   {title:'Create Kanban Board', description:'Develop a kanban board'}
  // ];
  // inProgress: Task[] = [];
  // done: Task[] = [];

  todo = getObservable(this.store.collection('todo'));
  inProgress = getObservable(this.store.collection('inProgress'));
  done = getObservable(this.store.collection('done'));

  // drop(event: CdkDragDrop<Task[]>): void{
  //   if(event.previousContainer === event.container){
  //     return;
  //   }
  //   transferArrayItem(
  //     event.previousContainer.data,
  //     event.container.data,
  //     event.previousIndex,
  //     event.currentIndex
  //   );
  // }

  drop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) {
      return;
    }
    const item = event.previousContainer.data[event.previousIndex];
    this.store.firestore.runTransaction(() => {
      const promise = Promise.all([
        this.store.collection(event.previousContainer.id).doc(item.id).delete(),
        this.store.collection(event.container.id).add(item),
      ]);
      return promise;
    });
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
  }

  editTask(list: 'done' | 'todo' | 'inProgress', task: Task): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task,
        enableDelete: true,
      },
    });
    // dialogRef.afterClosed().subscribe((result: TaskDialogResult) => {
    //   const dataList = this[list];
    //   const taskIndex = dataList.indexOf(task);
    //   if (result.delete) {
    //     dataList.splice(taskIndex, 1);
    //   } else {
    //     dataList[taskIndex] = task;
    //   }
    // });

    dialogRef.afterClosed().subscribe((result: TaskDialogResult) => {
      if (result.delete) {
        this.store.collection(list).doc(task.id).delete();
      } else {
        this.store.collection(list).doc(task.id).update(task);
      }
    });
  }
  newTask(): void {
    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '270px',
      data: {
        task: {},
      },
    });

    dialogRef
      .afterClosed()
      .subscribe((result: TaskDialogResult) => this.store.collection('todo').add(result.task));
  }
}
